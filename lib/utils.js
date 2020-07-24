const _ = require('lodash');
const { exec } = require('child_process');
const { config, defaults } = require('../config');

const getDefaults = monitors => {
  const defaultMonitors = monitors.map(monitor => {
    const [width, height] = monitor.resolution.split('x');
    const matchedDefault = _.find(defaults, def => {
      if (def.minWidth && def.minHeight) {
        return def.minWidth <= width && def.minHeight <= height;
      } else if (def.maxWidth && def.maxHeight) {
        return def.maxWidth >= width && def.maxHeight >= height;
      }
      return true;
    });
    return { ...monitor, ...matchedDefault, port: monitor.name };
  });
  return { name: 'Defaults', monitors: defaultMonitors };
};

const getConfigMatch = monitors => {
  let found = false;
  config.some(userConfig => {
    // TODO: no edid available, XID? CRTC?
    // look through monitors defined in config and assign monitor properties if edid match
    const cfg = userConfig.monitors.map(mon => {
      const searchKey = mon.edid ? { edid: mon.edid } : { port: mon.port };
      const foundMonitor = _.find(monitors, searchKey);
      return {
        port: _.get(foundMonitor, 'name'),
        ..._.omit(foundMonitor, ['name']),
        ...mon
      };
    });
    // if every monitor in config has port assigned this is our match
    // found = cfg.every(cfgMon => cfgMon.port) ? { ...userConfig, monitors: cfg } : found;
    found = { ...userConfig, monitors: cfg };
    return found;
  });
  return found || getDefaults(monitors);
};

const parseXrandr = out => {
  const monitors = [];
  const lines = out.split('\n').map(line => line.trim());
  // console.log('lines', lines);
  lines.forEach((line, i) => {
    if (/\sconnected\s/.test(line)) {
      monitors.push({
        name: line.split(' ')[0],
        primary: line.includes('primary'),
        resolution: line.match(/\s\d+x\d+/)[0].trim()
      });
    } else if (/EDID:/.test(line)) {
      monitors[monitors.length - 1].edid = lines[i + 1].trim();
    }
  });
  return monitors;
};

const getMonitors = () =>
  new Promise((resolve, reject) => {
    exec('xrandr --prop', (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || new Error(`stderr: ${stderr}`));
      }
      const monitors = parseXrandr(stdout);
      resolve(monitors);
    });
  });

const execXrandr = args =>
  new Promise((resolve, reject) => {
    exec(`xrandr ${args}`, (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || new Error(`stderror: ${stderr}`));
      }
      resolve(stdout);
    });
  });

const execNotifySend = args =>
  new Promise((resolve, reject) => {
    exec(`notify-send ${args}`, (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || new Error(`stderr: ${stderr}`));
      }
      resolve(stdout);
    });
  });

module.exports = { getMonitors, getConfigMatch, execXrandr, execNotifySend };
