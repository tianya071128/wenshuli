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
  /**
   * 组件初始化方法：
   *  根组件初始化：
   *    1. 通过 mergeOptions 合并组件配置项(从构造函数、组件配置项、mixin等合并)
   *    2. 初始化组件数据，例如初始化一些属性($parent、$root、$children、$refs 等)、初始化 data、props、watch 等数据
   *    3. 如果是根组件并且配置了 el 选项，则调用 vm.$mount 渲染成 DOM 并且插入 DOM 树中
   *  而子组件初始化存在一些不同：子组件渲染过程一般不会在这里调用 $mount 挂载，此时回到 core\vdom\create-component.js 的 createComponentInstanceForVnode 方法中
   *    1. 合并选项在生成表示组件 Vnode 过程中，会调用 Vue.extend 方法，此时就会合并选项处理存放在 Vue.extend 返回的子类构造器的 options 属性上，此时直接提取出来即可
   *    2. 一般而言不能在子组件的配置项上配置 el 选项，在这里不会调用 $mount 方法进行渲染，而是在后续才会调用
   */
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
      /**
       * 子组件的配置项处理：直接赋值给 vm.$options
       *  1. 从子类构造函数的 options 提取出已经合并的选项，在 Vue.extend 生成子类构造器时会进行选项合并处理
       *  2. 从表示组件的 vnode.componentOptions 中提取出父组件注入给子组件的相关数据
       */
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
    // 初始化 props、methods、data、computed、wather -- 具体策略见方法注解
    initState(vm);

    /**
     * 初始化 provide 数据 -- 祖先组件向其所有子孙后代注入一个依赖
     * 策略：
     *  1. 直接从 vm.$options.provide 中提取出来即可，与 data 类似，如果是函数调用则提取函数，如果是对象则直接返回
     *  2. 直接赋值到  vm._provided 上，因为这个是祖先组件注入的依赖，子组件获取这个依赖时，会递归查找祖先组件的 _provided 属性获取依赖，详见 resolveInject 函数
     */
    initProvide(vm); // resolve provide after data/props 解决数据/道具后提供的问题

    // 执行 created 生命周期钩子
    callHook(vm, 'created');

    /* istanbul ignore if */
    // 性能追踪结束
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false); // 获取组件名 name
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    /**
     * 渲染过程：
     *  当初始化组件完成(合并选项，初始化数据，见 _init 方法)，接下来就是渲染流程，主要是由 $mount 方法启动
     *  $mount 是区分平台的，weex 和 web 主要是由 mountComponent(core/instance/lifecycle) 驱动，只是会在参数方面会做一些额外处理。
     *  而在 web 端，还分为是否需要编译器，在需要编译器的情况下，还需要将 template 模板进行编译成 render 函数
     *  暂时忽略编译器的内容，直接从 web 端不携带编译器的情况，入口在 platforms/web/runtime/index.js
     */
    if (vm.$options.el) {
      // 在这里，如果子组件也配置了 el 选项，控制台会发出警告(在Vue.extend() 方法中调用 mergeOptions 方法合并 el 选项时)
      // 但是还是会走一步进行 $mount 挂载，但是在后续又会将生成的 DOM(在 vnode.elm 访问) 插入到应该存在的位置
      vm.$mount(vm.$options.el);
    }
  };
}

/**
 * 子组件的配置项处理：
 *  1. 从子类构造函数的 options 提取出已经合并的选项，在 Vue.extend 生成子类构造器时会进行选项合并处理
 *  2. 从表示组件的 vnode.componentOptions 中提取出父组件注入给子组件的相关数据
 */
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  // 从构造器中提取 options 选项
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration. 这样做是因为它比动态枚举更快
  const parentVnode = options._parentVnode; // 表示组件的 Vnode
  opts.parent = options.parent; // 父组件实例引用
  opts._parentVnode = parentVnode;

  // 提取出组件 vnode 的额外配置项
  /**
   * componentOptions: { // 这些信息会作为组件表示的 vnode 额外配置项，会在后续初始化子组件时有大用
   *   Ctor: ƒ VueComponent(options), // 组件构造器
   *   children: undefined, // 组件插槽
   *   listeners: undefined, // 组件的事件侦听器
   *   propsData: undefined, // 父组件传入的 props 数据
   *   tag: "my-component"
   * },
   */
  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData; // 父组件注入的 props
  opts._parentListeners = vnodeComponentOptions.listeners; // 父组件侦听的事件
  opts._renderChildren = vnodeComponentOptions.children; // 作为子节点插槽(静态插槽)
  opts._componentTag = vnodeComponentOptions.tag; // tag 标签

  // 。。。
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
  let options = Ctor.options; // 提取出子类 options
  // 如果是 Vue.extend() 构造出来的子类，那么就找到超类，递归获取到 options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super); // 超类的 options
    const cachedSuperOptions = Ctor.superOptions; // 缓存的超类 options
    // 在 Vue.extend() 中会进行 options 超类和子类合并，但是有可能后续选项变更了，此时处理的就是这种情况
    if (superOptions !== cachedSuperOptions) {
      // super option changed, 超类的选项已更改
      // need to resolve new options. 需要解决新的选择
      Ctor.superOptions = superOptions; // 重新建立引用
      // check if there are any late-modified/attached options (#4976) 检查是否有任何后期修改/附加选项
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options 更新基本扩展选项
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
