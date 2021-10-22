// 侧边栏
module.exports = {
  // 路径配置
  "/01_前端/": [
    {
      title: "基础标签", // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "01_html/01_index",
        "01_html/02_全局属性",
        "01_html/03_head",
        "01_html/04_meta",
      ],
    },
    // {
    //   title: "表单", // 分组标题
    //   collapsable: false, // 是否可折叠，可选的，默认true
    //   sidebarDepth: 2, // 深度，可选的, 默认值是 1
    //   children: [
    //     // 这个表示的是路径?
    //     "01_html/01_index",
    //     "01_html/02_全局属性",
    //     "01_html/03_head",
    //     "01_html/04_meta",
    //   ],
    // },
  ],
};
