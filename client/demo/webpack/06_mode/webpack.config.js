const path = require('path');

module.exports = {
  mode: 'development',
  // mode: 'production',
  entry: './src/index.js',
  context: __dirname,
  output: {
    filename: 'js/[name].[fullhash:4].js',
    path: path.resolve(__dirname, 'webpack_dist'),
    clean: true,
  },
  name: 'wenshuli',
};
