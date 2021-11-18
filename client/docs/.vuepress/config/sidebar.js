// 侧边栏
module.exports = {
  // 路径配置
  "/01_前端/01_html/": [
    {
      title: "基础标签", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "01_index",
        "02_全局属性",
        "03_head",
        "04_meta",
        "05_img",
        "06_a",
        "10_other",
      ],
    },
    {
      title: "表单", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "07_form",
        "08_form_data",
        "09_form_js",
      ],
    },
  ],
  "/01_前端/03_js/": [
    {
      title: "ES", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        "01_ES基本概念",
        "02_内存机制1-数据存储",
      ],
    },
  ],
  "/05_网络协议/01_http/": [
    {
      title: "HTTP", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        "00_思考问题",
        // 这个表示的是路径?
        "01_index",
        "02_method",
        "03_status",
        "04_content",
        "08_bigFile",
        "05_connection",
        "06_cookie",
        "07_cache",
        "09_cors",
      ],
    },
    {
      title: "HTTPS", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        "10_https",
        "11_https安全性",
        "12_TLS",
      ],
    },
  ],
};
