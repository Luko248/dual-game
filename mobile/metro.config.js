const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/* The game ships as a single self-contained HTML asset. */
config.resolver.assetExts.push('html');

module.exports = config;
