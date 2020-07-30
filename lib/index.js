require('pretty-error').start();
const util = require('util');

const { getConfigMatch, getMonitors, execXrandr, execNotifySend } = require('./utils');

const echo = process.stdout.write.bind(process.stdout);

const inspect = obj =>
  util
    .inspect(obj, { colors: true })
    .split('\n')
    .join('\n  ');

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
  // TODO: enable percentages for relative positioning
  monitors.forEach(mon => {
    if (mon.position) {
      args.push(`--output ${mon.port} --pos ${mon.position}`);
    }
  });
  return args;
};

const xrandrCommands = async match => {
  // const args = buildXrandrArgs(match.monitors);
  const args = match.xrandr || [];
  return Promise.all(args.map(async arg => execXrandr(arg)));
};

const monEnv = match => {
  let envStr = '';
  match.monitors.forEach(mon => {
    envStr += envStr.length > 0 ? ':' : '';
    envStr += `port=${mon.port};polybar=${mon.polybar};termite=${mon.termite}`;
  });
  return envStr;
};

const exportsEnv = match => {
  const envs = match.env || [];
  return envs.join(':');
};

const sendNotification = async match => {
  const args = [
    '--expire-time=10000',
    '--icon=computer',
    `"Monitor Config: ${match ? match.name : 'none'}"`
  ];

  const message =
    match && match.monitors
      ? match.monitors
          .map(
            mon =>
              `${mon.port} ${mon.resolution}${mon.zoom || ''}, \n-pbar:${mon.polybar} term:${
                mon.termite
              }`
          )
          .join('\n')
      : `No matching monitors found`;

  // args.push(`"${message}"`);
  return execNotifySend(args.join(' '));
};

const parseArgs = async arg => {
  const monitors = await getMonitors();
  const match = getConfigMatch(monitors);
  let results = arg ? `Invalid argument: ${arg}` : 'Must provide argument "xrandr" or "env"';

  if (arg === 'env') {
    results = monEnv(match);
  } else if (arg === 'exports') {
    results = exportsEnv(match);
  } else if (arg === 'xrandr') {
    results = await xrandrCommands(match);
  } else if (arg === 'notify') {
    results = await sendNotification(match);
  } else {
    results = [
      '',
      `Matched Monitor: ${inspect(match, { colors: true })}`,
      `env: ${inspect(monEnv(match), { colors: true })}`,
      `exports: ${inspect(exportsEnv(match), { colors: true })}`,
      `xrandr: ${inspect(match.xrandr, { colors: true })}`,
      ''
    ].join('\n  ');
  }
  echo(results);
};

const arg = process.argv[2];
parseArgs(arg);
