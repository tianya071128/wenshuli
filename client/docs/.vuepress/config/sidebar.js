// 侧边栏
module.exports = {
  // 路径配置
  '/01_前端/01_html/': [
    {
      title: '基础标签', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_index',
        '02_全局属性',
        '03_head',
        '04_meta',
        '05_img',
        '06_a',
        '10_other',
      ],
    },
    {
      title: '表单', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['07_form', '08_form_data', '09_form_js'],
    },
  ],
  '/01_前端/02_css/': [
    {
      title: 'CSS概念', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_index',
        '05_层叠、优先级和继承',
        '06_盒模型',
        '07_层叠上下文',
        '08_格式化上下文',
      ],
    },
    {
      title: 'CSS模块', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['02_选择器', '03_伪元素', '04_伪类', '09_值和单位'],
    },
    {
      title: 'CSS布局', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '11_布局概述',
        '12.正常布局流',
        '13_浮动和定位布局',
        '14_弹性布局',
        '15_网格布局',
      ],
    },
  ],
  '/01_前端/03_js/': [
    {
      title: 'ES', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_ES基本概念',
        '02_内存机制-数据存储',
        '03_内存机制-垃圾回收',
        '04_内存机制-内存检测和内存泄露',
        '07_JS执行机制-执行上下文',
        '08_JS执行机制-作用域、作用域链',
        '05_JS执行机制-事件循环',
        '06_V8编译-运行时环境',
        '09_JS数据类型-函数和闭包',
      ],
    },
    {
      title: 'DOM', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '10_DOM',
        '11_DOM_节点操作',
        '12_DOM_几何位置',
        '13_DOM_事件',
        '14_DOM_事件类型',
      ],
    },
    {
      title: 'web API', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        {
          title: '数据存储', // 分组标题
          collapsable: false, // 是否可折叠，可选的，默认true
          sidebarDepth: 2, // 深度，可选的, 默认值是 1
          children: ['15_cookie', '16_Web Storage', '17_IndexedDB'],
        },
        {
          title: '二进制数据，文件', // 分组标题
          collapsable: false, // 是否可折叠，可选的，默认true
          sidebarDepth: 2, // 深度，可选的, 默认值是 1
          children: [
            '18_ArrayBuffer',
            '19_Blob、File和FileReader',
            '20_文件操作',
          ],
        },
        {
          title: '网络请求', // 分组标题
          collapsable: false, // 是否可折叠，可选的，默认true
          sidebarDepth: 2, // 深度，可选的, 默认值是 1
          children: ['21_XHR', '22_轮询', '23_webSocket'],
        },
      ],
    },
  ],
  '/01_前端/04_浏览器/': [
    {
      title: '浏览器渲染', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_Chrome基础架构',
        '02_导航流程',
        '03_渲染流程',
        '04_渲染相关概念',
      ],
    },
    {
      title: '浏览器安全', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['05_跨站脚本攻击(XSS)', '06_跨站请求伪造(CSRF)'],
    },
  ],
  '/05_网络协议/01_http/': [
    {
      title: 'HTTP', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_index',
        '02_method',
        '03_status',
        '04_content',
        '08_bigFile',
        '05_connection',
        '06_cookie',
        '07_cache',
        '09_cors',
        '10_抓包分析',
      ],
    },
  ],
  '/05_网络协议/02_https/': [
    {
      title: 'HTTPS', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_https', '02_https安全性', '03_TLS', '04_抓包分析'],
    },
  ],
  '/05_网络协议/03_http2/': [
    {
      title: 'HTTP/2', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_h2'],
    },
  ],
  '/06_工程化/01_vscode/': [
    {
      title: 'vscode', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_设置', '02_概述', '03_调试', '04_扩展'],
    },
  ],
  '/06_工程化/02_eslint/': [
    {
      title: 'ESLint', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_eslint', '02_eslint配置', '03_格式化程序', '04_插件'],
    },
  ],
  '/06_工程化/03_webpack/': [
    {
      title: 'webpack 配置', // 分组标题
      collapsable: true, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        // '01_webpack',
        '02_mode',
        '03_entry_context',
        '04_loader',
        '05_module',
        '06_output',
        '10_watch',
        '08_sourceMap',
        '11_devServer',
        '12_hot',
        '09_cache',
      ],
    },
    // {
    //   title: 'webpack 概念', // 分组标题
    //   collapsable: true, // 是否可折叠，可选的，默认true
    //   sidebarDepth: 2, // 深度，可选的, 默认值是 1
    //   children: ['09_cache'],
    // },
  ],
  '/06_工程化/04_其他/': [
    {
      title: '工程化 - 其他', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_Prettier', '02_Browserslist'],
    },
  ],
  '/06_工程化/05_babel/': [
    {
      title: 'babel', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '01_index',
        '02_配置文件',
        '03_配置选项',
        '04_预设',
        '05_preset-env预设',
        '06_插件',
        '07_babal架构',
      ],
    },
  ],
  '/06_工程化/06_npm/': [
    {
      title: 'npm', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_npm', '02_命令', '03_发布包', '05_获取包'],
    },
    {
      title: 'npm 使用', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['04_package文件', '06_依赖包'],
    },
  ],
  '/06_工程化/07_scss/': [
    {
      title: 'Sass(Scss)', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: ['01_index', '02_CSS 功能扩展', '03_SassScript'],
    },
    {
      title: 'Sass 规则', // 分组标题
      collapsable: false, // 是否可折叠，可选的，默认true
      sidebarDepth: 2, // 深度，可选的, 默认值是 1
      children: [
        '04_规则',
        '05_流控制规则',
        '06_混入',
        '07_函数',
        '08_扩展',
        '09_导入',
        '10.模块系统',
      ],
    },
  ],
  '/07_参考/': ['01.index'],
};
