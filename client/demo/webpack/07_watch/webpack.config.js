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
  watch: true,
  watchOptions: {
    aggregateTimeout: 2000,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1 * 1024,
            },
          },
        ],
      },
    ],
  },
};
