/*﻿    第五百五十四章  叶遮天*/
const head = require('./config/head.js');
const plugins = require('./config/plugins.js');
const themeConfig = require('./config/themeConfig.js');
const webpack = require('webpack');

// 导出 vuepress 配置s
module.exports = {
  // 页面标题, 同时也会显示在左上角(默认主题下)
  title: '我的前端',
  // 插入 <meta name="description" content="个人学习知识库, 用于记录学习日志"> 用于 SEO
  description: '个人学习知识库, 用于记录学习日志',
  markdown: {
    lineNumbers: true, // 代码行号
  },
  devServer: {
    proxy: {
      '/vuepress_test': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.BASE_URL': JSON.stringify(
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:5000'
            : 'http://1.12.248.68:5000'
        ),
      }),
    ],
  },
  plugins, // 插件
  head, // 额外的需要被注入到当前页面的 HTML <head> 中的标签
  themeConfig, // 主题配置 - 暂时使用默认主题
  evergreen: true, // 如果你的对象只有那些 “常青树” 浏览器，你可以将其设置成 true，这将会禁止 ESNext 到 ES5 的转译以及对 IE 的 polyfills，同时会带来更快的构建速度和更小的文件体积。
};
