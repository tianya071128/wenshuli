const path = require('path');

const i = 0;
const modes = [
  'source-map',
  'eval',
  'eval-source-map',
  'inline-source-map',
  'inline-cheap-source-map',
  'inline-cheap-module-source-map',
  'hidden-source-map',
  'nosources-source-map',
];

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: `main.${modes[i]}.js`,
    path: path.resolve(__dirname, 'dist_test'),
  },
  devtool: modes[i],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-object-rest-spread'],
          },
        },
      },
    ],
  },
};
