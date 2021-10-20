const head = require("./config/head.js");
// const plugins = require('./config/plugins.js');
const themeConfig = require("./config/themeConfig.js");

// 导出 vuepress 配置
module.exports = {
  // 页面标题, 同时也会显示在左上角(默认主题下)
  title: "知识库",
  // 插入 <meta name="description" content="个人学习知识库, 用于记录学习日志"> 用于 SEO
  description: "个人学习知识库, 用于记录学习日志",
  markdown: {
    lineNumbers: true, // 代码行号
  },

  head, // 额外的需要被注入到当前页面的 HTML <head> 中的标签
  themeConfig, // 主题配置 - 暂时使用默认主题
};
