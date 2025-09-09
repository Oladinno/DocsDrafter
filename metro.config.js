const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer/'),
};

module.exports = withNativeWind(config, { input: './global.css' });