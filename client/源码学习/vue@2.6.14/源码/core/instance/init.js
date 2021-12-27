/* @flow */

import config from '../config';
import { initProxy } from './proxy';
import { initState } from './state';
import { initRender } from './render';
import { initEvents } from './events';
import { mark, measure } from '../util/perf'; // 性能追踪的工具类
import { initLifecycle, callHook } from './lifecycle';
import { initProvide, initInjections } from './inject';
import { extend, mergeOptions, formatComponentName } from '../util/index';

let uid = 0;

export function initMixin(Vue: Class<Component>) {
  // 组件初始化方法
  Vue.prototype._init = function(options?: Object) {
    const vm: Component = this;
    // a uid // 为组件增加 uid
    vm._uid = uid++;

    let startTag, endTag;
    /* istanbul ignore if */
    if (
      process.env.NODE_ENV !== 'production' &&
      config.performance /** 设置为 true 以在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪。 */ &&
      mark
    ) {
      startTag = `vue-perf-start:${vm._uid}`;
      endTag = `vue-perf-end:${vm._uid}`;
      mark(startTag);
    }

    // a flag to avoid this being observed 避免出现这种情况的标志
    // 避免观察 Vue 实例(vm)， 做个标记表示为组件实例
    vm._isVue = true;
    // merge options 合并选项

    if (options && options._isComponent /** 子组件的合并选项方式不同 */) {
      // optimize internal component instantiation 优化内部组件实例化
      // since dynamic options merging is pretty slow, and none of the 因为动态选项合并非常慢，而且
      // internal component options needs special treatment. 内部组件选项需要特殊处理
      // 子组件的合并方法 -- 有所不同
      initInternalComponent(vm, options);
    } else {
      // 根组件的合并配置项方法
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor), // 从构造函数链提取 options
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    // 设置渲染时的上下文，在开发环境尝试使用 Proxy 语法
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm);
    } else {
      vm._renderProxy = vm;
    }
    // expose real self 暴露 vm 实例
    vm._self = vm;
    // 在 beforeCreate 钩子之前，数据处理之前，初始化渲染方面的内容
    /**
     * initLifecycle 处理了如下工作：
     *  将该组件推入到父组件的 $children 中，
     *  建立 $parent、$root 指针指向父组件和根组件
     *  初始化 $children、$refs 属性，在后续会将其推入到集合中
     *  创建一些以 _ 开头的内部属性
     */
    initLifecycle(vm);
    // 处理了如下工作：处理组件自定义事件 => 自定义事件在渲染成 VNode 过程中被存储在 _parentListeners 中的
    initEvents(vm);
    // 初始化渲染方面工作：主要是子组件渲染方面以及添加了 $createElement _c 渲染 VNode 的方法 ----- 待续
    initRender(vm);

    // 执行 beforeCreate 生命周期钩子
    callHook(vm, 'beforeCreate');

    // 以下为组件数据处理
    /**
     * 初始化 inject 数据 -- 依赖注入，接收祖先组件注入的依赖
     * 策略：
     *  1. 从祖先组件(或取 default 默认值)中提取出 inject 的值
     *  2. 递归 inject 配置的 key，通过 defineReactive 方法(只读属性 key)注入到 vm 实例上
     */
    initInjections(vm); // resolve injections before data/props 在 data/props 之前解决 injections 问题
    initState(vm);
    initProvide(vm); // resolve provide after data/props

    callHook(vm, 'created');

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

/**
 * 从构造函数链中提取出 options(options API 允许的选项或者自定义选项)
 * 实例的构造函数：
 *  如果是 new Vue() 的话，就表示是 Vue 构造函数，就会从中提取出 components、directives、filters 等资源.如果通过 Vue.mixin 注入的全局混入资源都会在 Vue 构造函数中提取出来
 *  如果是通过 Vue.extend() 创建出来的子类，然后 new 一个子类的实例。那么就会递归提取出 options
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options; // 提取出 options
  // 如果是 Vue.extend() 构造出来的子类，那么就找到超类，递归获取到 options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super);
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  const latest = Ctor.options;
  const sealed = Ctor.sealedOptions;
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
