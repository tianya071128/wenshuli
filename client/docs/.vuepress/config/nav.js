// nav
module.exports = [
  // 说明：以下所有link的值只是在相应md文件定义的永久链接（不是什么特殊生成的编码）。另外，注意结尾是有斜杠的
  {
    text: '前端',
    items: [
      { text: 'html', link: '/html/' },
      // { text: 'css', link: '/css/' },
      { text: 'js', link: '/js/' },
    ],
  },
  {
    text: '网络协议',
    items: [{ text: 'http', link: '/http/' }],
  },
  {
    text: '工程化',
    items: [
      { text: 'babel', link: '/babel/' },
      { text: 'ESLint', link: '/eslint/' },
      { text: 'webpack', link: '/webpack/' },
      { text: 'vscode', link: '/vscode/' },
      { text: 'prettier', link: '/prettier/' },
    ],
  },
  {
    text: '项目',
    items: [{ text: '学习记录', link: 'http://weshuli.com/study/#/home' }],
  },
  {
    text: '参考',
    link: '/reference/',
  },
];
