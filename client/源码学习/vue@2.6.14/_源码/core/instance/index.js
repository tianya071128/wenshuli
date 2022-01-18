import { initMixin } from './init';
import { stateMixin } from './state';
import { renderMixin } from './render';
import { eventsMixin } from './events';
import { lifecycleMixin } from './lifecycle';
import { warn /** 警告方法 */ } from '../util/index';

// Vue 构造函数
function Vue(options) {
  if (
    process.env.NODE_ENV !== 'production' /** 开发环境 */ &&
    !(this instanceof Vue) /** 没有使用 new 构造 */
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword'); // Vue是一个构造函数，应使用'new'关键字调用
  }
  // 初始化
  this._init(options);
}

// 下面是为 Vue 原型上添加属性或方法，一般而言，如果是 $ 开头的是暴露出去开发者也可以使用的，以 _ 开头是内部工具开发者慎用
initMixin(Vue); // 添加 _init 方法
stateMixin(Vue); // 添加 $data、$props 属性， 添加 $set、$delete、$watch 方法
eventsMixin(Vue); // 添加 $on、$once、$off、$emit 方法，提供发布-订阅者模式
lifecycleMixin(Vue); // 添加 _update、$forceUpdate、$destroy 方法，与组件渲染 DOM 相关
renderMixin(Vue); // 添加 $nextTick、_render 方法，渲染成 VNode 表示

export default Vue;
