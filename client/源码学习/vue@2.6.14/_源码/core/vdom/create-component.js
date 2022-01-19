/* @flow */
// 这个文件是创建组件 vnode 的过程，并且包含了 vnode 渲染过程全周期钩子，通过这些钩子来启动 vnode 的渲染，挂载，销毁操作

import VNode from './vnode';
import { resolveConstructorOptions } from 'core/instance/init';
import { queueActivatedComponent } from 'core/observer/scheduler';
import { createFunctionalComponent } from './create-functional-component';

import { warn, isDef, isUndef, isTrue, isObject } from '../util/index';

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData,
} from './helpers/index';

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent,
} from '../instance/lifecycle';

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate,
} from 'weex/runtime/recycle-list/render-component-template';

// inline hooks to be invoked on component VNodes during patch 在修补期间在组件VNode上调用的内联钩子
// 组件类型 Vnode 的钩子函数
const componentVNodeHooks = {
  // 组件 vnode 的初始钩子，在这里启动组件 vnode 的渲染过程
  // 调用位置在 core\vdom\patch.js 的 createComponent 方法中
  init(vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance && // 这个 vnode 已经被实例化了
      !vnode.componentInstance._isDestroyed && // 这个 vnode 的实例没有被销毁
      vnode.data.keepAlive // 是 keepAlive 缓存的
    ) {
      // kept-alive components, treat as a patch 保持活性的组件，作为补丁处理
      const mountedNode: any = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      // 不是缓存组件，初始化组件 -- 通过
      const child = (vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance // 正在渲染的组件实例引用
      ));
      // 通过 _init 初始化实例，初始化组件数据相关，接着在调用 $mount 方法生成 DOM 并挂在 Vnode.elm 上，
      // 此时一般情况下(子组件的初始化过程)还不是挂载在 DOM 树上，会在后续才挂载在 DOM 树中
      // 而在 $mount 方法中，子组件也会存在一些不同，最主要见 patch 方法 -- core\vdom\patch.js
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },
  /**
   * 组件类型 Vnode 的补丁操作，在这里可以表示父组件注入子组件的 props、attrs、event、插槽等数据发生变化, 此时组件类型 Vnode 发生一些变化，但是组件实例还是可以共用的，详见 updateChildComponent 方法
   * 调用位置在 core\vdom\patch.js 的 patchVnode 方法中
   */
  prepatch(oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions; // 新的组件配置信息(这些配置信息表示父组件注入子组件的信息)
    const child = (vnode.componentInstance = oldVnode.componentInstance); // 复用组件实例
    // 通过这个方法来实现子组件的更新，具体见方法注解
    updateChildComponent(
      child, // 组件实例
      options.propsData, // updated props 更新注入的 props
      options.listeners, // updated listeners 更新 listeners 事件
      vnode, // new parent vnode 新的组件类型 Vnode
      options.children // new children 新的子节点(作为插槽，不包含作用域插槽))
    );
  },

  /**
   * 插入到 DOM 树后执行，会在渲染过程中将初始的子组件收集起来，等待根组件真正插入到 DOM 树后统一执行这个钩子
   * 在这里，初次渲染的组件执行 mounted 钩子，主要是处理缓存组件相关
   * 调用位置在 core\vdom\patch.js 的 invokeCreateHooks 方法
   */
  insert(vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode;
    // 如果这个组件还没有挂载过
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true; // 标识为已挂载状态
      callHook(componentInstance, 'mounted'); // 执行 mounted 钩子
    }
    // 此时是缓存组件的情况
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may 在更新期间，保持活动状态组件的子组件可能会
        // change, so directly walking the tree here may call activated hooks  改变，所以直接在树上行走可能会调用激活的钩子
        // on incorrect children. Instead we push them into a queue which will 关于不正确的孩子。相反，我们将他们推到一个队列中
        // be processed after the whole patch process ended. 在整个修补程序过程结束后进行处理。
        queueActivatedComponent(componentInstance);
      } else {
        activateChildComponent(componentInstance, true /* direct */);
      }
    }
  },

  /**
   * 组件销毁时执行,
   * 调用位置在 core\vdom\patch.js 的 invokeDestroyHook 方法
   */
  destroy(vnode: MountedComponentVNode) {
    const { componentInstance } = vnode; // 组件实例
    if (!componentInstance._isDestroyed /** 组件还没有被销毁 */) {
      if (!vnode.data.keepAlive /** 不是缓存组件 */) {
        componentInstance.$destroy(); // 调用 $destroy() 方法进行组件的销毁
      } else {
        // 缓存组件
        deactivateChildComponent(componentInstance, true /* direct */);
      }
    }
  },
};

const hooksToMerge = Object.keys(componentVNodeHooks);

/**
 * 生成组件类型的 Vnode -- 其中可能是普通子组件、函数式组件、异步组件等类型组件
 *  对于普通子组件：
 *    1. 根据 Ctor 配置项通过 Vue.extend() 生成一个子类，在这里就可以完成组件配置项的合并等工作、
 *    2. 处理 v-model 语法糖：
 *        在 vue-loader 或编译器时，才可以使用 v-model，在编译的过程中，会将 v-model="test" 编译成 data.model = { value: test, callback: function() { xxx } }
 *         此时处理组件 options 时，就需要根据组件 options.model 配置来重新生成 data
 *         2.1. 处理 data.model.value 值，根据 options.model.prop 值来添加到 data.attrs 中
 *         2.2. 处理 data.model.callback 值，根据 options.model.event 值来添加到 data.on 中
 *    3. 根据组件配置项 props，从数据对象的 props 和 attrs 中提取出 propsData，后续在初始化 props 时使用(见 core\instance\state.js 的 initProps 方法)
 *    4. 初始化组件的 hooks，添加到 data.hook 中 -- init、prepatch、insert、destroy 的钩子 -- 这几个贯穿了 vnode 的生命周期
 *    5. 根据这些信息生成 Vnode 实例，最终 Vnode 大致如下：
 *    {
 *      componentInstance：undefined, // 这个组件实例，后续初始化后会添加到这个属性上
 *      componentOptions: { // 这些信息会作为组件表示的 vnode 额外配置项，会在后续初始化子组件时有大用
 *        Ctor: ƒ VueComponent(options), // 组件构造器
 *        children: undefined, // 组件插槽
 *        listeners: undefined, // 组件的事件侦听器
 *        propsData: undefined, // 父组件传入的 props 数据
 *        tag: "my-component"
 *      },
 *      context: vm, // 渲染这个组件的上下文实例，表示这个组件的父组件
 *      data: {
 *        hook: {...}, // 组件 vnode 的钩子
 *        ..., // 参考: https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1
 *      },
 *      ...
 *    }
 *  对于函数式组件：
 *    1. 与普通组件类似的步骤，根据 Ctor 配置项生成子类构造器 -> 处理 options 可能存在的缓存问题 -> 处理 v-model 语法糖 -> 提取 props 为 propsData
 *    2. 后续就由 createFunctionalComponent 接管函数式组件生成 Vnode 的步骤
 *        -> 主要见方法注解
 *        -> 大体上是直接生成函数式组件 模板内容的 Vnode
 *  对于异步组件：
 *    1. 对于异步组件，不需要根据 Ctor 配置项生成子类构造器，直接判断 Ctor.cid 为 undefined 来判定为函数式组件，调用 resolveAsyncComponent 方法
 *    2. 控制权交由 resolveAsyncComponent 方法 -> 在这个方法中，会根据加载状态返回需要渲染的组件构造器(在方法内部就已经通过 extend() 方法创建子类构造器)
 *       -> 如果异步组件没有需要渲染的组件的话(即异步组件状态没有配置相应的组件)，此时直接返回一个空的 Vnode
 *       -> 如果返回了组件构造器，那么后续流程都一样，进行普通组件 Vnode 的生成
 */
export function createComponent(
  Ctor: Class<Component> | Function | Object | void, // 组件配置项
  data: ?VNodeData, // 数据对象 -- 参考: https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1
  context: Component, // 渲染的上下文组件实例
  children: ?Array<VNode>, // 子节点(一般作为插槽)
  tag?: string // 组件名
): VNode | Array<VNode> | void {
  // 组件配置项为 undefined，直接返回
  if (isUndef(Ctor)) {
    return;
  }

  // 指向 Vue 构造函数
  const baseCtor = context.$options._base;

  // plain options object: turn it into a constructor 普通选项对象：将其转换为构造函数
  /**
   * 通过选项对象，最常用的，选项配置项为一个对象
   * 为什么在这里通过 extend(方法定义在 core/global-api/extend.js) 创建一个子类构造函数？
   *  因为 extend 方法可以对同一个 options 进行缓存并且将合并选项等工作在这里就统一处理，以免重复工作
   */
  if (isObject(Ctor)) {
    // 根据 Ctor 配置项返回一个子类构造器
    Ctor = baseCtor.extend(Ctor);
  }

  // if at this stage it's not a constructor or an async component factory, 如果在这个阶段，它不是构造函数或异步组件工厂
  // reject. 拒绝
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context); // 无效的组件定义
    }
    return;
  }

  // async component 异步组件
  // 异步组件 - 直接通过 Ctor.cid 判断是否为异步组件
  let asyncFactory;
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor; // 异步工厂，即异步组件注册时的函数，见：https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%BC%82%E6%AD%A5%E7%BB%84%E4%BB%B6
    // 根据异步组件加载状态和配置返回应该展示的组件构造器 - 如果没有的话，则返回 undefined
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered 返回呈现的异步组件的占位符节点
      // as a comment node but preserves all the raw information for the node. 作为注释节点，但保留节点的所有原始信息。
      // the information will be used for async server-rendering and hydration. 这些信息将用于异步服务器渲染和水合。
      // 当返回 undefined 时，直接创建一个异步组件空节点占位符
      return createAsyncPlaceholder(asyncFactory, data, context, children, tag);
    }
    // 如果这个异步组件有渲染的组件(可能是成功或失败或加载中组件)，那么我们就接着往下执行，向渲染正常组件一样进行生成 Vnode 即可
  }

  // 数据对象 -- 不存在的话重置为 {}
  data = data || {};

  // resolve constructor options in case global mixins are applied after 解决构造函数选项，以防在
  // component constructor creation 组件构造函数创建
  // 虽然在上面 baseCtor.extend 创建子类构造函数时就会对 options 进行合并，但是因为存在缓存而 optinos 选项可能发生变更
  // 所以在这里还需要考虑选项 options 变更后的处理
  resolveConstructorOptions(Ctor);

  // transform component v-model data into props & events 将组件 v-model 数据转换为 props/events
  // 处理组件的 v-model，也就是 props/events 的语法糖
  if (isDef(data.model)) {
    transformModel(Ctor.options, data);
  }

  // extract props 提取 props
  /**
   * 提取出 propsData(父组件传递的 props): 后续初始化组件 props 时会提取值
   * 1. 提取出组件配置的 props
   * 2. 遍历 props, 进行每一项 prop 的处理
   *    2.1 检查该 prop 定义的名称是否不符合规范
   *    2.2 首先从 vnode.data.props 中提取
   *    2.2 如果不存在 vnode.data.props 中, 再次尝试从 vnode.data.attrs 中提取出来, 如果提取出来就需要从 vnode.data.attrs 中删除这个属性(因为 vnode.data.attrs 会作为 DOM 属性添加到元素上)
   * 3. 最后生成一个对象结构: { [key: string]: any }
   *
   * 注意: 这里只是提取出父组件传递的 props, 并不进行 prop 的验证以及默认值操作, 会在后续初始化 props 处理
   */
  const propsData = extractPropsFromVNodeData(data, Ctor, tag);

  // functional component 函数式组件
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children);
  }

  // 在创建组件 vnode 中，data.on 定义的是通过 $emit 触发的事件侦听器，所以提取出来到 listeners，后续作为组件配置供初始化 _enent 使用(见 core\instance\events.js 的 initEvents 方法)
  // data.nativeOn 就表示需要用于监听组件根元素的 DOM 事件
  // 需要分析事件侦听监听器和 DOM 事件之间存在一定的区别

  // extract listeners, since these needs to be treated as 提取侦听器，因为这些侦听器需要作为
  // child component listeners instead of DOM listeners 子组件侦听器而不是DOM侦听器
  const listeners = data.on; // data.on：事件监听器
  // replace with listeners with .native modifier 替换为具有的侦听器。原生修饰语
  // so it gets processed during parent component patch. 因此，它在父组件补丁期间得到处理
  data.on = data.nativeOn; // data.nativeOn：仅用于组件，用于监听原生事件，而不是组件内部使用

  // 抽象组件
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything 抽象组件不保留任何内容
    // other than props & listeners & slot 除了 props & listeners & slot

    // work around flow
    const slot = data.slot;
    data = {};
    if (slot) {
      data.slot = slot;
    }
  }

  // install component management hooks onto the placeholder node 在占位符节点上安装组件管理挂钩
  // 初始化组件的 hooks，添加到 data.hook 中 -- init、prepatch、insert、destroy 的钩子
  installComponentHooks(data);

  // return a placeholder vnode 返回占位符vnode
  const name = Ctor.options.name || tag;
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`, // 根据 name cid 来组装成一个 tag
    data, // 处理过的数据对象
    undefined,
    undefined,
    undefined,
    context, // 渲染子组件的上下文组件(父组件实例)
    // 这个作为子组件的额外配置项 - 因为 data 对象是与其他类型 vnode 共用的，所以一些额外的信息放在这里 - 后续会在子组件初始化时使用
    {
      Ctor, // 构造函数
      propsData, // propsData 对象
      listeners, // 组件事件侦听器
      tag, // template 中使用的组件名 - 例如： <my-component />
      children, // 子组件，作为插槽
    },
    asyncFactory // 异步组件工厂函数 --
  );

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode);
  }

  return vnode;
}

// 根据 vnode 来初始化组件实例(主要是 new vnode.componentOptions.Ctor 实例化)
export function createComponentInstanceForVnode(
  // we know it's MountedComponentVNode but flow doesn't 我们知道它是MountedComponentVNode，但flow不知道
  vnode: any, // 需要初始化的 vnode
  // activeInstance in lifecycle state 处于生命周期状态的activeInstance
  parent: any // 正在渲染的组件实例引用
): Component {
  // 初始化组件实例的配置项
  const options: InternalComponentOptions = {
    _isComponent: true, // 表示这是一个组件
    _parentVnode: vnode, // 表示组件的 vnode
    parent, // 父组件实例引用
  };
  // check inline-template render functions 检查内联模板渲染函数
  // 如果是 template 内联模板，会经过编译器进行遍历的
  const inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render; // render 函数
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  // 在这里 new 后，主要还是要 _init 初始方法，接下来就是初始过程
  return new vnode.componentOptions.Ctor(options);
}

// 初始化组件的 hooks，添加到 data.hook 中 -- init、prepatch、insert、destroy 的钩子
// 这几个钩子贯穿了 vnode 的生命周期 -- 注意不是组件的生命周期
function installComponentHooks(data: VNodeData) {
  const hooks = data.hook || (data.hook = {}); // 提取出 data.hook
  // hooksToMerge：是具有 init、prepatch、insert、destroy 方法的对象
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]; // 提取出初始钩子
    const existing = hooks[key]; // 现有的 -- 如果已经在 data.hook 中定义了这个钩子
    const toMerge = componentVNodeHooks[key];
    // 针对一个钩子并没有合并过
    if (
      existing !== toMerge && // 现有的钩子 不等于 初始的钩子
      !(existing && existing._merged) // 对于这个钩子并没有合并过
    ) {
      // 此时如果用户自定义了同名钩子，那么就将两个钩子封装成一个函数都进行调用
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
    }
  }
}

// 合并组件 vnode 的生命周期钩子
function mergeHook(f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true; // 标识已经合并过
  return merged;
}

// transform component v-model info (value and callback) into 将组件 v-model 信息（值和回调）转换为
// prop and event handler respectively. 分别是prop和事件处理程序
/**
 * 处理 v-model：
 *  在 vue-loader 或编译器时，才可以使用 v-model，在编译的过程中，会将 v-model="test" 编译成 data.model = { value: test, callback: function() { xxx } }
 *  此时处理组件 options 时，就需要根据组件 options.model 配置来重新生成 data
 *  1. 处理 data.model.value 值，根据 options.model.prop 值来添加到 data.attrs 中
 *  2. 处理 data.model.callback 值，根据 options.model.event 值来添加到 data.on 中
 */
function transformModel(
  options, // 组件的配置项
  data: any // 组件的 vnode 数据对象
) {
  const prop = (options.model && options.model.prop) || 'value'; //  model.prop ，默认为 value
  const event = (options.model && options.model.event) || 'input'; // model.event，默认为 input
  // 为 data.attrs 中 prop 赋值为 data.model.value
  // data.model.value：在生成 vnode 的时候，会将 v-model 绑定的值添加到 data.model.value 中，所以 data.model.value 绑定就是 v-model 绑定值
  (data.attrs || (data.attrs = {}))[prop] = data.model.value;
  // 事件
  const on = data.on || (data.on = {});
  const existing = on[event]; // 如果已经注册 event 事件的话
  const callback = data.model.callback; // 同 data.model.value 类似，但这个 callback 是内部封装改变的方法
  // 如果已经注册过 event 表示的事件的话
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      // 那么就组装成数组，都要执行
      on[event] = [callback].concat(existing);
    }
  } else {
    // 否则直接添加到 data.on 事件上
    on[event] = callback;
  }
}
