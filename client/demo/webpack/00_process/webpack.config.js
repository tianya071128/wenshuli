const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'js/[name].[fullhash:4].js',
    path: path.resolve(__dirname, 'webpack_dist'),
    clean: true,
  },
  name: 'wenshuli',
  // recordsPath: path.join(__dirname, 'records.json'),
};