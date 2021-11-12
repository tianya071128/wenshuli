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
        "01_html/05_img",
        "01_html/06_a",
      ],
    },
    {
      title: "表单", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // 这个表示的是路径?
        "01_html/07_form",
        "01_html/08_form_data",
      ],
    },
  ],
  "/05_网络协议/": [
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
    {
      title: "HTTPS", // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        "01_http/10_https",
        "01_http/11_https安全性",
        "01_http/12_TLS",
      ],
    },
  ],
};
