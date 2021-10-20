const nav = require('./nav.js');
const htmlModules = require('./htmlModules.js');
const sidebar = require('./sidebar.js');

// 主题配置
module.exports = {
  logo: '/img/EB-logo.png', // 导航栏logo
  smoothScroll: true, // 页面滚动效果。
  searchMaxSuggestions: 10, // 搜索结果显示最大数
  sidebarDepth: 2, // 将同时提取markdown中h2 和 h3 标题，显示在侧边栏上。
  sidebar, // 侧边栏配置 
  nav, // 导航栏配置
  lastUpdated: '上次更新', // 开启更新时间，并配置前缀文字   string | boolean (取值为git提交时间)
}
