/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive,
} from '../util/index';

import { createElement } from '../vdom/create-element';
import { installRenderHelpers } from './render-helpers/index';
import { resolveSlots } from './render-helpers/resolve-slots';
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots';
import VNode, { createEmptyVNode } from '../vdom/vnode';

import { isUpdatingChildComponent } from './lifecycle';

/**
 * 初始化渲染方面工作：
 *
 */
export function initRender(vm: Component) {
  vm._vnode = null; // the root of the child tree 子树的根
  vm._staticTrees = null; // v-once cached trees v-once缓存树
  const options = vm.$options;
  const parentVnode = (vm.$vnode = options._parentVnode); // the placeholder node in parent tree 父树中的占位符节点
  const renderContext = parentVnode && parentVnode.context;
  // 先处理作为 options._renderChildren(vnode.componentOptions.children 中提取出来) 插槽内容 - 一般是不带作用域的插槽(在废弃的插槽语法中，这里可能包括具名插槽)
  vm.$slots = resolveSlots(options._renderChildren, renderContext); // 结构：{ [name: string]: ?Array<VNode> }
  // 作用域插槽(在新语法中，具名插槽也会被封装成函数)等到实际使用时才会执行
  vm.$scopedSlots = emptyObject;
  // bind the createElement fn to this instance 将createElement fn绑定到此实例
  // so that we get proper render context inside it. 这样我们就可以在其中获得适当的渲染上下文。
  // args order: tag, data, children, normalizationType, alwaysNormalize 参数顺序：标记、数据、子项、规范化类型、alwaysNormalize
  // internal version is used by render functions compiled from templates 内部版本由从模板编译的渲染函数使用
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false);
  // normalization is always applied for the public version, used in 规范化始终应用于公共版本，用于
  // user-written render functions. 用户编写的渲染函数
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true);

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data;

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(
      vm,
      '$attrs',
      (parentData && parentData.attrs) || emptyObject,
      () => {
        !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm);
      },
      true
    );
    defineReactive(
      vm,
      '$listeners',
      options._parentListeners || emptyObject,
      () => {
        !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm);
      },
      true
    );
  } else {
    defineReactive(
      vm,
      '$attrs',
      (parentData && parentData.attrs) || emptyObject,
      null,
      true
    );
    defineReactive(
      vm,
      '$listeners',
      options._parentListeners || emptyObject,
      null,
      true
    );
  }
}

// 当前渲染组件
export let currentRenderingInstance: Component | null = null;

// for testing only 仅供测试
// 改变渲染组件
export function setCurrentRenderingInstance(vm: Component) {
  currentRenderingInstance = vm;
}

// 添加 $nextTick、_render 方法
export function renderMixin(Vue: Class<Component>) {
  // install runtime convenience helpers 安装运行时便利助手
  installRenderHelpers(Vue.prototype);

  Vue.prototype.$nextTick = function(fn: Function) {
    return nextTick(fn, this);
  };

  // 生成 VNode 方法
  // 在组件的依赖项变化或插槽变化的时候就会重新调用这个方法生成新的 vnode
  Vue.prototype._render = function(): VNode {
    const vm: Component = this;
    /**
     * _parentVnode：我们需要理解 Vnode 的概念，如果在生成 Vnode 的过程中，碰到子组件的话，会将子组件的相关信息生成一个组件表示的 Vnode,
     *               然后在通过这些信息去生成一个组件实例并会将组件实例挂载到 _parentVnode.child 属性上
     *               从变量命名来看好像是父组件的 Vnode，其实不是如此，注意这个区别
     */
    const { render, _parentVnode } = vm.$options; // 提取出 render 渲染函数、_parentVnode(组件表示的 VNode)

    // 如果存在组件 VNode，那么尝试从组件 VNode 中提取插槽 -- 表示这是一个子组件
    if (_parentVnode) {
      // $scopedSlots - 用来访问作用域插槽。 在 2.6.0 版本下，所有的 $slots 现在都会作为函数暴露在 $scopedSlots 中。
      /**
       * 处理作用域插槽：
       *  1. 先根据各个缓存属性来判断是否可以从上一次提取结果获取
       *  2. 遍历 slots(作用域插槽集合，一般对应 vnode.data.scopedSlots)，将作用域插槽函数进一步封装
       *     - 如果是使用 v-slot 新语法的话，那么就在　normalSlots(一般对应 vm.$slots) 参数上添加这个插槽 key - 通过复杂数据对象引用改变入参
       *  3. 遍历已经提取出来的插槽(对应 vm.$slots)，如果不存在作用域插槽集合(对应 vm.$scopedSlots)中，那么就封装一下添加在作用域插槽集合
       *     - 在 2.6.0 中，所有的插槽现在都会作为函数暴露在 $scopedSlots 中。
       *
       * 总而言之，这里可能会将插槽处理为如下结构：
       *  slots(对应 vm.$scopedSlots) { // 所有插槽都会被封装成函数
       *    default: f (),
       *    jumingslot: f (),
       *    scopeslot: f ()
       *  }
       *
       *  noramlSlots(对应 vm.$slots) { // 注意这里已经将具名插槽(不包含作用域插槽)已经提取出来了
       *    default: Array<VNode>,
       *    jumingslot: Array<VNode>
       *  }
       */
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots, // 随时从组件类型 Vnode.data 中取出最新的，因为也可以更新前后不一致
        vm.$slots,
        vm.$scopedSlots
      );
    }

    // set parent vnode. this allows render functions to have access 设置父vnode。这允许渲染函数具有访问权限
    // to the data on the placeholder node. 添加到占位符节点上的数据
    vm.$vnode = _parentVnode; // 将组件 Vnode 放到 $vnode 属性上
    // render self 渲染自身
    let vnode;
    try {
      // There's no need to maintain a stack because all render fns are called 不需要维护堆栈，因为所有渲染FN都被调用
      // separately from one another. Nested component's render fns are called 彼此分开。嵌套组件的渲染FN被调用
      // when parent component is patched. 当父组件被修补时
      currentRenderingInstance = vm; // 当前渲染的组件
      // 暂时略过生成 Vnode 的过程
      vnode = render.call(
        vm._renderProxy, // 渲染的上下文，定义在 ./init.js 的 _init 方法中，一般指向 vm 实例
        vm.$createElement // 渲染 Vnode 的工具函数，就在这个文件中定义
      );
    } catch (e) {
      // 如果渲染成 Vnode 过程中报错的话
      handleError(e, vm, `render`); // 处理错误
      // return error render result, 返回错误渲染结果
      // or previous vnode to prevent render error causing blank component 或上一个vnode，以防止渲染错误导致空白组件
      if (
        process.env.NODE_ENV !== 'production' &&
        vm.$options.renderError // 只在开发者环境下工作。当 render 函数遭遇错误时，提供另外一种渲染输出。
      ) {
        try {
          // 当 render 函数遭遇错误时，提供另外一种渲染输出。
          vnode = vm.$options.renderError.call(
            vm._renderProxy,
            vm.$createElement,
            e
          );
        } catch (e) {
          handleError(e, vm, `renderError`); // 处理错误
          vnode = vm._vnode; // 此时使用上一个 Vnode
        }
      } else {
        vnode = vm._vnode; // 此时使用上一个 Vnode，如果是初始渲染，则不存在
      }
    } finally {
      // 重置标识
      currentRenderingInstance = null;
    }
    // if the returned array contains only a single node, allow it 如果返回的数组只包含一个节点，请允许它
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0];
    }
    // return empty vnode in case the render function errored out 如果渲染函数出错，则返回空vnode
    // 返回不是 VNode 实例
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' + // 从渲染函数返回多个根节点。渲染功能
            'should return a single root node.', // 应返回单个根节点
          vm
        );
      }
      vnode = createEmptyVNode(); // 渲染空节点
    }
    // set parent
    vnode.parent = _parentVnode; // vnode 中也保持着 组件表示 Vnode 引用
    return vnode;
  };
}
