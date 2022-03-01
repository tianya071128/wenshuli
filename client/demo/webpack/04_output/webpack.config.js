const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'js/[name].[fullhash:4].js',
    path: path.resolve(__dirname, 'webpack_dist'),
    clean: true,
    // chunkFilename: 'chunkJS/[fullhash].js',
    chunkFilename(pathData) {
      return 'chunkJS/[name].[fullhash:4].js';
    },
    chunkLoadingGlobal: 'myCustomFunc',
    chunkLoadTimeout: 60000,
    // chunkFormat: 'commonjs',
    publicPath(...args) {
      return '/dist/';
    },
    devtoolModuleFilenameTemplate: (info) => {
      return `webpack://${info.namespace}/${info.resourcePath}?${info.loaders}标识一下`;
    },
    sourceMapFilename: '[file].map[query]',
    asyncChunks: true,
    environment: {
      // arrowFunction: false,
    },
    // module: true,
    // scriptType: 'module',
  },
  experiments: {
    outputModule: true,
  },
  devtool: false,
  optimization: {
    moduleIds: 'size',
    runtimeChunk: 'single',
  },
  plugins: [new HtmlWebpackPlugin()],
};
