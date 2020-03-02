const { getConfigMatch, getMonitors, execXrandr } = require('./utils');

const echo = process.stdout.write.bind(process.stdout);

const buildXrandrArgs = monitors => {
  const args = [];

  monitors.forEach((mon, i) => {
    const arg = [
      `--output ${mon.port}`,
      mon.primary ? '--primary' : '',
      mon.scale ? `--scale ${mon.scale}` : '',
      mon.dpi ? `--dpi ${mon.dpi}` : ''
    ];
    if (mon.relative) {
      const relMon = parseInt(mon.relative.match(/\$(\d)/)[1], 10);
      arg.push(mon.relative.replace(/\$\d/, monitors[relMon - 1].port));
    }
    args.push(arg.filter(Boolean).join(' '));
  });
  // have to do position args after monitors initialized
  monitors.forEach(mon => {
    if (mon.position) {
      args.push(`--output ${mon.port} --pos ${mon.position}`);
    }
  });
  return args;
};

const xrandrCommands = async match => {
  const args = buildXrandrArgs(match.monitors);
  return Promise.all(args.map(async arg => execXrandr(arg)));
  // return Promise.all(
  //   args.map(async arg => {
  //     return Promise.resolve(arg);
  //   })
  // );
};

const envVar = match => {
  let envStr = '';
  match.monitors.forEach(mon => {
    envStr += envStr.length > 0 ? ':' : '';
    envStr += `port=${mon.port};polybar=${mon.polybar};termite=${mon.termite}`;
  });
  return envStr;
};

const parseArgs = async arg => {
  const monitors = await getMonitors();
  const match = getConfigMatch(monitors);
  let results = arg ? `Invalid argument: ${arg}` : 'Must provide argument "xrandr" or "env"';
  if (arg === 'env') {
    results = envVar(match);
  } else if (arg === 'xrandr') {
    results = await xrandrCommands(match);
  }
  echo(results);
};

const arg = process.argv[2];
parseArgs(arg);
