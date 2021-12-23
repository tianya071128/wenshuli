/* @flow */

import { mergeOptions } from '../util/index';

// 添加 mixin 静态方法 -- 全局注册一个混入，影响注册之后所有创建的每个 Vue 实例。
export function initMixin(Vue: GlobalAPI) {
  Vue.mixin = function(mixin: Object) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
}
