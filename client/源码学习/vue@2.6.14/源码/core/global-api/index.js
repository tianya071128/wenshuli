/* @flow */

import config from '../config';
import { initUse } from './use';
import { initMixin } from './mixin';
import { initExtend } from './extend';
import { initAssetRegisters } from './assets';
import { set, del } from '../observer/index';
import { ASSET_TYPES } from '../../shared/constants';
import builtInComponents from '../components/index';
import { observe } from 'core/observer/index';

import {
  warn,
  extend, // 方法定义在 shared/util.js 中，用于对象浅合并
  nextTick,
  mergeOptions,
  defineReactive,
} from '../util/index';

// 添加静态属性或方法
export function initGlobalAPI(Vue) {
  // config -- Vue.config 是一个对象，包含 Vue 的全局配置。可以在启动应用之前修改下列 property：
  const configDef = {};
  configDef.get = () => config;
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.' // 请勿更换Vue。配置对象，改为设置单个字段请勿更换Vue。配置对象，改为设置单个字段
      );
    };
  }
  // 添加 config 对象，只读属性
  Object.defineProperty(Vue, 'config', configDef);

  // exposed util methods. 公开的util方法
  // NOTE: these are not considered part of the public API - avoid relying on 注意：这些不被视为公共API的一部分-避免依赖
  // them unless you are aware of the risk. 除非你意识到了风险，否则就不要这样做
  // 这些工具函数不是提供给开发者，如果使用的话需要承担风险
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive,
  };

  // 添加 set、delete、nextTick 方法
  Vue.set = set;
  Vue.delete = del;
  Vue.nextTick = nextTick;

  // 2.6 explicit observable API 2.6明确的可观察API -- 让一个对象可响应。
  Vue.observable = (obj) => {
    observe(obj);
    return obj;
  };

  // 创建无原型的对象
  Vue.options = Object.create(null);
  /**
   * 存储全局资源的地方
   * 'component',
   * 'directive',
   * 'filter'
   */
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + 's'] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object 这用于标识扩展所有普通对象的“基本”构造函数
  // components with in Weex's multi-instance scenarios. 在Weex的多实例场景中使用的组件
  Vue.options._base = Vue;

  // 添加 KeepAlive 全局组件
  extend(Vue.options.components, builtInComponents);

  initUse(Vue); // 添加 use 静态方法 -- 安装 Vue.js 插件。
  initMixin(Vue); // 添加 mixin 静态方法 -- 全局注册一个混入，影响注册之后所有创建的每个 Vue 实例。
  initExtend(Vue); // 添加 extend 静态方法 -- 使用基础 Vue 构造器，创建一个“子类”。
  initAssetRegisters(Vue); // 添加 component、filter、mixin 静态方法 -- 注册全局资源
}
