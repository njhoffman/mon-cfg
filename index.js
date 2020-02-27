const { cosmiconfigSync } = require('cosmiconfig');
const { exec } = require('child_process');
const { get, find } = require('lodash');
const { name } = require('./package.json');

const echo = process.stdout.write.bind(process.stdout);
const verbose = false;

// apt-get install read-edid
// mon-cfg ed1 ed2 e3 - 1920x1080 3840x2160 3840x2160

const explorerSync = cosmiconfigSync(name);
const { config, filepath } = explorerSync.search() || {};

if (verbose && filepath) {
  console.log(` Loaded configuration from: ${filepath}`);
}

const parseXrandr = out => {
  // console.log(`stdout: ${out}`);
  const monitors = [];
  const lines = out.split('\n');
  lines.forEach((line, i) => {
    if (/\sconnected\s/.test(line)) {
      monitors.push({
        name: line.split(' ')[0],
        primary: line.includes('primary')
      });
    } else if (/EDID:/.test(line)) {
      monitors[monitors.length - 1].edid = lines[i + 1].trim();
    }
  });
  return monitors;
};

const getConfigMatch = monitors => {
  let found = false;
  config.user.some(userConfig => {
    const cfg = userConfig.monitors.map(mon => ({
      port: get(find(monitors, { edid: mon.edid }), 'name'),
      ...mon
    }));
    found = cfg.every(cfgMon => cfgMon.port) ? { ...userConfig, monitors: cfg } : found;
    return found;
  });
  return found;
};

const getDefaults = () => {
  const defaults = config.defaults || {
    polybar: 'top'
  };
  return defaults;
};

const xrandrCommands = match => {
  const commands = [];
  match.monitors.forEach((mon, i) => {
    const command = [
      'xrandr',
      `--output ${mon.port}`,
      mon.primary ? '--primary' : '',
      mon.scale ? `--scale ${mon.scale}` : '',
      mon.dpi ? `--dpi ${mon.dpi}` : ''
    ];
    if (mon.relative) {
      const relMon = parseInt(mon.relative.match(/\$(\d)/)[1], 10);
      command.push(mon.relative.replace(/\$\d/, match.monitors[relMon - 1].port));
    }
    commands.push(command.filter(Boolean).join(' '));
  });
  // have to do position commands after monitors initialized
  match.monitors.forEach(mon => {
    if (mon.position) {
      commands.push(`xrandr --output ${mon.port} --pos ${mon.position}`);
    }
  });
  return commands;
};

const envVar = match => {
  let envStr = '';
  match.monitors.forEach(mon => {
    envStr += envStr.length > 0 ? ':' : '';
    envStr += `port=${mon.port};polybar=${mon.polybar}`;
  });
  return envStr;
};

const getMonitors = () =>
  new Promise((resolve, reject) => {
    exec('xrandr --prop', (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }

      if (stderr) {
        reject(new Error(`stderr: ${stderr}`));
      }

      const monitors = parseXrandr(stdout);
      let match = getConfigMatch(monitors);
      if (!match) {
        match = getDefaults();
      }
      resolve(match);
    });
  });

const getEnv = async () => {
  const match = await getMonitors();
  return envVar(match);
};

const getXrandrCommands = async () => {
  const match = await getMonitors();
  return xrandrCommands(match);
};

const parseArgs = async arg => {
  if (arg === 'env') {
    echo(await getEnv());
  } else if (arg === 'xrandr') {
    echo(await getXrandrCommands());
  }
};

const arg = process.argv[2];
parseArgs(arg);
