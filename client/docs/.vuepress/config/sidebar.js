// 侧边栏
module.exports = {
  // 路径配置
  "/01_前端/": [
    {
      title: "基础标签", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "01_html/01_index",
        "01_html/02_全局属性",
        "01_html/03_head",
        "01_html/04_meta",
        "01_html/05_img图片",
      ],
    },
    // {
    //   title: "表单", // 分组标题
    //   collapsable: true, // 是否可折叠，可选的，默认true
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
  "/05_其他/": [
    {
      title: "HTTP", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "01_http/01_index",
        "01_http/02_method",
        "01_http/03_status",
        "01_http/04_content",
        "01_http/08_bigFile",
        "01_http/05_connection",
        "01_http/06_cookie",
        "01_http/07_cache",
        "01_http/09_cors",
      ],
    },
  ],
};
