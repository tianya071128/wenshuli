/* @flow */

import VNode, { cloneVNode } from './vnode';
import { createElement } from './create-element';
import { resolveInject } from '../instance/inject';
import { normalizeChildren } from '../vdom/helpers/normalize-children';
import { resolveSlots } from '../instance/render-helpers/resolve-slots';
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots';
import { installRenderHelpers } from '../instance/render-helpers/index';

import {
  isDef,
  isTrue,
  hasOwn,
  camelize,
  emptyObject,
  validateProp,
} from '../util/index';

/**
 * 生成函数式组件的渲染上下文 context - contect 对象见：https://cn.vuejs.org/v2/guide/render-function.html#%E5%87%BD%E6%95%B0%E5%BC%8F%E7%BB%84%E4%BB%B6
 */
export function FunctionalRenderContext(
  data: VNodeData, // 数据对象，渲染 Vnode 的数据对象
  props: Object, // 已经解析完毕的 props
  children: ?Array<VNode>, // 子节点，作为插槽
  parent: Component, // 父组件引用
  Ctor: Class<Component> // 子类构造器，主要用来提取出合并后的 options
) {
  const options = Ctor.options; // 提取出 options
  // ensure the createElement function in functional components 确保功能组件中的createElement功能
  // gets a unique context - this is necessary for correct named slot check 获取唯一上下文-这对于正确的命名插槽检查是必需的
  let contextVm; // 在下面会重写 _c(就是 render 函数的第一个参数) 方法，用这个变量作为 createElement 方法的第一个参数，作为上下文实例
  /**
   * 如果 parent 存在 _uid 属性，表示父组件是一个组件实例(不包括函数式组件)
   *  1. 是组件实例的话，将 parent 作为 contextVm 用于 createElement 方法的第一个参数
   *  2. 不是组件实例的话，表示这个函数式组件的父组件也是一个函数式组件
   *     此时，contextVm 直接取 parent，并且将 parent 重置为 parent._original
   *
   *     例如：第一个函数式组件 render(h) { return h('my-component') }
   *          my-component 组件也是一个函数式组件，render(h) { return h('div', '嵌套的函数式组件') }
   *     在这种情况下，在渲染第二个函数式组件，调用 FunctionalRenderContext 这个方法传入的 parent 也就是第一个函数式组件生成的 contextVm
   *
   * 总而言之，这里做的处理就是保持
   *  contextVm 引用着父组件(不是函数式组件的)
   *  parent 也是引用着父组件(不是函数式组件的)
   */
  if (hasOwn(parent, '_uid')) {
    contextVm = Object.create(parent); // 渲染这个组件的上下文实例，即父组件实例
    // $flow-disable-line
    contextVm._original = parent; // 缓存下这个函数式组件的真正父组件
  } else {
    // the context vm passed in is a functional context as well. 传入的上下文vm也是一个函数上下文。
    // in this case we want to make sure we are able to get a hold to the 在这种情况下，我们希望确保我们能够抓住
    // real context instance. 真实上下文实例。
    contextVm = parent;
    // $flow-disable-line
    parent = parent._original;
  }
  // 如果是经过编译器编译的话，会在 options 上添加 _compiled 属性
  // 自定义 render 函数的话，就不会存在这个属性
  const isCompiled = isTrue(options._compiled);
  const needNormalization = !isCompiled;

  // 接下来就是构造渲染上下文 context 对象
  this.data = data; // 传递给组件的整个数据对象(作为 createElement 的第二个参数传入组件)
  this.props = props; // 提供所有 prop 的对象
  this.children = children; // VNode 子节点的数组
  this.parent = parent; // 对父组件的引用
  this.listeners = data.on || emptyObject; // (2.3.0+) 一个包含了所有父组件为当前组件注册的事件监听器的对象。这是 data.on 的一个别名。
  this.injections = resolveInject(options.inject, parent); // (2.3.0+) 如果使用了 inject 选项，则该对象包含了应当被注入的 property。
  // 一个函数，返回了包含所有插槽的对象
  this.slots = () => {
    if (!this.$slots) {
      normalizeScopedSlots(
        data.scopedSlots,
        (this.$slots = resolveSlots(children, parent))
      );
    }
    return this.$slots;
  };

  // 作用域插槽
  Object.defineProperty(
    this,
    'scopedSlots',
    ({
      enumerable: true,
      get() {
        return normalizeScopedSlots(data.scopedSlots, this.slots());
      },
    }: any)
  );

  // support for compiled functional template 对已编译函数模板的支持
  if (isCompiled /** 编译器编译的 */) {
    // exposing $options for renderStatic()
    this.$options = options;
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots();
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
  }

  // 重写 _c 渲染 Vnode 方法，主要是预定义 contextVm 指向实例化的父组件(不是函数式组件)
  // 为什么需要预定义 contextVm 变量，因为在 createElement 方法及之后的调用栈中都需要 context 实例
  // 我们可以将函数式组件看成一个只关注生成 Vnode 的函数，而组件局部注册、子孙组件的引用都是不存在的(因为不是进行实例化)，
  // 所以如果在函数式组件中也使用了子组件的话，这些组件都是从父组件中的注册组件中提取出来的
  if (options._scopeId /** 需要添加 css 作用域 */) {
    this._c = (a, b, c, d) => {
      const vnode = createElement(contextVm, a, b, c, d, needNormalization);
      if (vnode && !Array.isArray(vnode)) {
        // 添加 vnode 标识作用域
        vnode.fnScopeId = options._scopeId;
        vnode.fnContext = parent;
      }
      return vnode;
    };
  } else {
    this._c = (a, b, c, d) =>
      createElement(contextVm, a, b, c, d, needNormalization);
  }
}

// 初始化一些渲染工具，因为函数式组件是没有实例的(没有 this)，也就在添加到 Vue.prototype 上的渲染工具无法使用
// 就需要在这里添加到 FunctionalRenderContext 实例上，以供访问到这些渲染工具方法，并且这些工具方法保持 this 引用到 FunctionalRenderContext 对象上
installRenderHelpers(FunctionalRenderContext.prototype);

/**
 * 生成函数式组件 Vnode
 *  1. 结合 propsData 和 组件配置项 生成最终使用的 props -- 在 propsData 基础上验证 prop 和提取默认值
 *  2. 通过 FunctionalRenderContext 生成函数式组件 render 函数中第二个参数 context 上下文
 *     但是还会重写 render 函数中第一个参数(即 createElement 封装函数，用于生成 Vnode)，主要是预定义 contextVm 指向实例化的父组件(不是函数式组件)
 *     -> 为什么需要预定义 contextVm 变量，因为在 createElement 方法及之后的调用栈中都需要 context 实例
 *     -> 我们可以将函数式组件看成一个只关注生成 Vnode 的函数，而组件局部注册、子孙组件的引用都是不存在的(因为不是进行实例化)
 *     -> 所以如果在函数式组件中也使用了子组件的话，这些组件都是从父组件中的注册组件中提取出来的
 *  3. 在这里直接调用 options.render 函数，并将上面重写的 _c 和 context 对象作为参数，生成函数式组件模板的 Vnode 并返回
 *     所以我们这里直接生成组件模板的 Vnode，而不需要后续实例化组件
 */
export function createFunctionalComponent(
  Ctor: Class<Component>, // 子类构造器
  propsData: ?Object, // 根据组件配置项 props 提取出来的 propsData -- 这个 propsData 不会不包含 props 的验证，默认值的提取，只是简单的从父组件注入的 attrs、props 中结合组件 props 配置提取值出来
  data: VNodeData, // 数据对象 -> 参考：https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1
  contextVm: Component, // 渲染函数式组件的上下文实例
  children: ?Array<VNode> // 子节点，作为插槽使用
): VNode | Array<VNode> | void {
  const options = Ctor.options; // 组件配置项，在 createComponent 方法中已经全部进行合并了的
  const props = {};
  const propOptions = options.props; // 组件 props 配置项
  /**
   * 注意：在 2.3.0 之前的版本中，如果一个函数式组件想要接收 prop，则 props 选项是必须的。在 2.3.0 或以上的版本中，你可以省略 props 选项，所有组件上的 attribute 都会被自动隐式解析为 prop。
   * 因为这个原因，如果组件没有配置 props 的话，我们直接从数据对象中的 attrs 和 props 提取
   *              如果组件配置了 props 的话，在 createComponent 方法中已经根据组件配置 props 的配置项提取出 propsData
   */
  if (isDef(propOptions) /** 如果组件提供了 props 配置项 */) {
    // 就需要处理组件配置 props 项，遍历处理
    for (const key in propOptions) {
      // propsData：只包含父组件注入进来(在这个 data 数据对象中的 attrs、props)的值结合 props 配置项提取值出来
      // 还需要结合 prop 配置，进行 prop 验证，提取默认值等操作
      props[key] = validateProp(key, propOptions, propsData || emptyObject);
    }
  } else {
    // 如果组件没有提供 props 配置项，那么直接将 attrs、props 数据对象解析为 prop
    // 将 data.attrs、data.props 合并进 props 对象中
    if (isDef(data.attrs)) mergeProps(props, data.attrs);
    if (isDef(data.props)) mergeProps(props, data.props);
  }

  // 函数式组件是不会进行实例化组件操作的，也就意味着无状态 (没有响应式数据)，也没有实例 (没有 this 上下文)
  // 此时会提供第二个参数 context 给 render 渲染函数，作为函数式组件的上下文
  // 而这个 context 对象通过 FunctionalRenderContext 方法进行构造的
  const renderContext = new FunctionalRenderContext(
    data, // 数据对象
    props, // props
    children, // 子节点(插槽)
    contextVm, //
    Ctor // 子类构造器
  );

  /**
   * 我们在这里是直接调用 render 渲染函数，生成函数式组件的 Vnode
   */
  const vnode = options.render.call(null, renderContext._c, renderContext);

  // 最后使用 cloneAndMarkFunctionalResult 方法处理下生成的 Vnode
  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(
      vnode,
      data,
      renderContext.parent,
      options,
      renderContext
    );
  } else if (Array.isArray(vnode) /** 如果生成的 Vnode 是数组 */) {
    const vnodes = normalizeChildren(vnode) || []; // 规范化数组
    const res = new Array(vnodes.length);
    for (let i = 0; i < vnodes.length; i++) {
      // 使用 cloneAndMarkFunctionalResult 方法处理下 vnode
      res[i] = cloneAndMarkFunctionalResult(
        vnodes[i],
        data,
        renderContext.parent,
        options,
        renderContext
      );
    }
    return res;
  }
}

function cloneAndMarkFunctionalResult(
  vnode,
  data,
  contextVm,
  options,
  renderContext
) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused 在设置fnContext之前克隆节点，否则如果重复使用该节点
  // (e.g. it was from a cached normal slot) the fnContext causes named slots （例如，它来自缓存的正常插槽）fnContext导致命名插槽
  // that should not be matched to match.这是不应该匹配的。
  const clone = cloneVNode(vnode); // 克隆 Vnode
  clone.fnContext = contextVm;
  clone.fnOptions = options;
  if (process.env.NODE_ENV !== 'production') {
    (clone.devtoolsMeta =
      clone.devtoolsMeta || {}).renderContext = renderContext;
  }
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot;
  }
  return clone;
}

// 合并 props - 简单的进 from、to 对象进行合并
function mergeProps(to, from) {
  for (const key in from) {
    // camelize：将 - 分隔字符串改成驼峰字符串，例如：demo-test => demoTest
    to[camelize(key)] = from[key];
  }
}
