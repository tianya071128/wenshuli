// 入口文件
import Vue from './instance/index'; // 引用的过程中为原型添加了一些属性和方法
import { initGlobalAPI } from './global-api/index';
import { isServerRendering } from './util/env';
import { FunctionalRenderContext } from './vdom/create-functional-component';

// 添加一些静态方法，有些是公开的，有些是内部使用
initGlobalAPI(Vue);

// 添加实例属性 $isServer -- 当前 Vue 实例是否运行于服务器。
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering, // 获取的方法，
});

// 添加实例属性 $ssrContext -- 此属性没有暴露给开发者
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get() {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext;
  },
});

// expose FunctionalRenderContext for ssr runtime helper installation 为ssr运行时帮助程序安装公开FunctionalRenderContext
// 添加静态属性：FunctionalRenderContext -- 用于服务器渲染(ssr)时使用
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext,
});

// Vue 版本，__VERSION__ 会被替换成版本
Vue.version = '__VERSION__';

export default Vue;
