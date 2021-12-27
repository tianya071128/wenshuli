/* @flow */

import Vue from 'core/index'; // 在这里会形成不区分平台 Vue 构造函数，添加一些方法和属性
import config from 'core/config'; // 配置对象
import { extend, /** 浅合并对象 */ noop /** 空函数 */ } from 'shared/util';
import { mountComponent } from 'core/instance/lifecycle';
import {
  devtools /** 检测devtools */,
  inBrowser /** 是否为浏览器环境 */,
} from 'core/util/index';

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement,
} from '../util/index';

import { patch } from './patch';
import platformDirectives from './directives/index';
import platformComponents from './components/index';

// install platform specific utils 安装特定于平台的工具方法
Vue.config.mustUseProp = mustUseProp;
Vue.config.isReservedTag = isReservedTag; // 判断是判断为合法标签
Vue.config.isReservedAttr = isReservedAttr; // 判断是否为合法 attr
Vue.config.getTagNamespace = getTagNamespace;
Vue.config.isUnknownElement = isUnknownElement;

// install platform runtime directives & components 安装平台运行时指令和组件
extend(Vue.options.directives, platformDirectives); // 添加 model 和 show 全局指令
extend(Vue.options.components, platformComponents); // 添加 Transition、TransitionGroup 全局内置组件

// install platform patch function 安装平台补丁功能
Vue.prototype.__patch__ = inBrowser ? patch : noop; // 如果不是浏览器环境，则为 noop

// public mount method web端公共渲染 VNode 成 DOM 方法
Vue.prototype.$mount = function(
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating);
};

// devtools global hook devtools 全局钩子 -- 提供给 devtools 使用
/* istanbul ignore next */
if (inBrowser /** 是否为浏览器环境 */) {
  setTimeout(() => {
    if (config.devtools /** 检测是否启用 devtools */) {
      if (devtools) {
        // 判断是否配置了 devtools 插件
        devtools.emit('init', Vue); // Vue 环境配置成功
      } else if (
        process.env.NODE_ENV !== 'production' && // 不是生成环境
        process.env.NODE_ENV !== 'test' // 不是测试环境
      ) {
        // 如果没有装载 devtools，则提供去加载插件
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' + // 下载Vue Devtools扩展以获得更好的开发体验
            'https://github.com/vuejs/vue-devtools'
        );
      }
    }
    if (
      process.env.NODE_ENV !== 'production' && // 不是生产环境
      process.env.NODE_ENV !== 'test' && // 不是测试环境
      config.productionTip !== false && //
      typeof console !== 'undefined' // 存在 console 对象
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` + // 您正在开发模式下运行Vue
        `Make sure to turn on production mode when deploying for production.\n` + // 在部署用于生产时，请确保启用生产模式
          `See more tips at https://vuejs.org/guide/deployment.html` // 查看更多提示，请访问 https://vuejs.org/guide/deployment.html
      );
    }
  }, 0);
}

export default Vue;
