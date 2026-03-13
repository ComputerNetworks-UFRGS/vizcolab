// craco.config.js
const webpack = require('webpack');

module.exports = {
  webpack: {
    alias: {
      util: require.resolve('util/'),
      stream: require.resolve('stream-browserify'),
      os: require.resolve('os-browserify'),
      http: require.resolve('stream-http'),
      url: require.resolve('url/'),
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.resolve.fallback = {
        fs: false,
      };

      return webpackConfig;
    },
  },
};
