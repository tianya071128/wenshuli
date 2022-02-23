const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

// 测试入口
const i = 3;
const entrys = [
  {
    entry1: './src/index.js',
  },
  {
    entry2: ['./src/index2.js', './src/index.js'],
  },
  {
    entry3_01: {
      import: './src/index.js',
      dependOn: 'entry3_02',
    },
    entry3_02: './src/index2.js',
  },
  {
    entry4: './src/index.js',
    entry5: './src/index2.js',
  },
];

// HtmlWebpackPlugin
let htmlWebpackPlugins = [];
for (const [key, value] of Object.entries(entrys[i])) {
  if (i <= 2) {
    htmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        filename: `index.${key}.html`,
      })
    );
    break;
  }

  htmlWebpackPlugins.push(
    new HtmlWebpackPlugin({
      filename: `index.${key}.html`,
      chunks: [key],
    })
  );
}

module.exports = {
  mode: 'development',
  entry: entrys[i],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist_test'),
  },
  devtool: false,
  plugins: [...htmlWebpackPlugins],
};
