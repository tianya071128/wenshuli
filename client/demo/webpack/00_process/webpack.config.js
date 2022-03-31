const path = require('path');

module.exports = {
  mode: 'development',
  // mode: 'production',
  entry: {
    main: {
      import: './src/index.js',
      // runtime: 'runtime_file',
    },
  },
  optimization: {
    runtimeChunk: 'single',
  },
  context: __dirname,
  output: {
    filename: 'js/[name].[fullhash:4].js',
    path: path.resolve(__dirname, 'webpack_dist'),
    clean: true,
  },
  name: 'wenshuli',
  devtool: false,
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          cache: true,
          fix: true,
          emitWarning: true,
        },
      },
      // {
      //   test: /\.m?js$/,
      //   exclude: /(node_modules|bower_components)/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       presets: [
      //         [
      //           '@babel/preset-env',
      //           {
      //             corejs: '3',
      //             useBuiltIns: 'usage',
      //           },
      //         ],
      //       ],
      //       plugins: ['@babel/plugin-transform-runtime'],
      //     },
      //   },
      // },
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
