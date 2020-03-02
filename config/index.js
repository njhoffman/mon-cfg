const _ = require('lodash');
const { cosmiconfigSync } = require('cosmiconfig');
const { name } = require('../package.json');

const verbose = false;

const explorerSync = cosmiconfigSync(name);
const { config, filepath } = explorerSync.search() || {};

// TODO: load from default.yml when published to npm and no need to compile
// const { config: appConfig } = explorerSync.load('config/defaults.yml');
const appConfig = {
  defaults: [
    {
      name: 'small',
      maxWidth: 1920,
      maxHeight: 1080,
      polybar: 'top',
      termite: 'config'
    },
    {
      name: 'large',
      minWidth: 1921,
      minHeight: 1081,
      polybar: 'top',
      termite: 'config'
    }
  ]
};

if (verbose && filepath) {
  console.log(` Loaded configuration from: ${filepath}`);
}

const { user, defaults } = config;
module.exports = {
  config: user,
  defaults: _.defaultsDeep(defaults, appConfig.defaults),
  filepath
};
