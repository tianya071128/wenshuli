// import vue from 'vue/dist/vue.esm.browser'
// import pageComponents from '@internal/page-components';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import http from './utils/request';

export default ({
  Vue, // VuePress 正在使用的 Vue 构造函数
  options, // 附加到根实例的一些选项
  router, // 当前应用的路由实例
  siteData, // 站点元数据
}) => {
  // window.Vue = vue // 使页面中可以使用Vue构造函数 （使页面中的vue demo生效）
  Vue.use(ElementUI);
  Vue.prototype.$http = http;
  Vue.prototype.BASE_URL = process.env.BASE_URL;
  // for (const [name, component] of Object.entries(pageComponents)) {
  //   Vue.component(name, component);
  // }
};
