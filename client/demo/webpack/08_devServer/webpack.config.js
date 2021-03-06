const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  devtool: 'inline-source-map',
  context: __dirname,
  devServer: {
    // historyApiFallback: true,
    // open: ['/my-page', '/another-page'],
    // host: 'localhost',
    // port: 8080,
    // webSocketServer: false,
    // client: {
    //   progress: true,
    // },
    proxy: {
      '/vuepress_test': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        logger: console,
      },
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Development',
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single',
  },
};
