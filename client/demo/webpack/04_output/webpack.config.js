const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'js/[name].[fullhash].[file].js',
    path: path.resolve(__dirname, 'dist_test'),
    clean: true,
    // chunkFilename: 'chunkJS/[fullhash].js',
    chunkFilename(pathData) {
      return 'chunkJS/[fullhash].js';
    },
    chunkLoadingGlobal: 'myCustomFunc',
    chunkLoadTimeout: 60000,
  },
  devtool: false,
  optimization: {
    moduleIds: 'size',
    runtimeChunk: 'single',
  },
  plugins: [new HtmlWebpackPlugin()],
};
