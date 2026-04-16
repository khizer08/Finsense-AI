const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    blacklistRE: /.*android[\\/]\.cxx[\\/].*/,
  },
};

module.exports = mergeConfig(defaultConfig, config);
