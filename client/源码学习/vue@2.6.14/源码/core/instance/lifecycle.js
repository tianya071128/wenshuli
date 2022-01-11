/* @flow */

import config from '../config';
import Watcher from '../observer/watcher';
import { mark, measure } from '../util/perf';
import { createEmptyVNode } from '../vdom/vnode';
import { updateComponentListeners } from './events';
import { resolveSlots } from './render-helpers/resolve-slots';
import { toggleObserving } from '../observer/index';
import { pushTarget, popTarget } from '../observer/dep';

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling,
} from '../util/index';

export let activeInstance: any = null; // 正在渲染的组件引用
// 正在更新子组件 Vnode 标识，这样的话，此时改变子组件 $attrs、$listeners、props 时就不会发出错误警告
// 其他情况下就需要不允许更新这些属性
export let isUpdatingChildComponent: boolean = false;

// 设置正在渲染组件的引用，并返回一个可以返回上一个状态的函数
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance; // 保存上一次引用
  activeInstance = vm; // 更改渲染组件引用
  // 返回上一个状态的方法
  return () => {
    activeInstance = prevActiveInstance;
  };
}

/**
 * 处理了如下工作：
 *  将该组件推入到父组件的 $children 中，
 *  建立 $parent、$root 指针指向父组件和根组件
 *  初始化 $children、$refs 属性，在后续会将其推入到集合中
 *  创建一些以 _ 开头的内部属性
 */
export function initLifecycle(vm: Component) {
  const options = vm.$options; // 提取配置项

  // locate first non-abstract parent 定位第一个非抽象父级
  let parent = options.parent; // 父组件
  if (
    parent &&
    !options.abstract /** 抽象父组件 - 在 vue 中表示 keep-alive、transition 内部组件 */
  ) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm); // 将其收集到父组件的 $children 中
  }

  vm.$parent = parent; // 父实例，如果当前实例有的话。
  vm.$root = parent ? parent.$root : vm; // 当前组件树的根 Vue 实例。如果当前实例没有父实例，此实例将会是其自己。

  vm.$children = []; // 当前实例的直接子组件 -- 在子组件创建的时候才会推入到集合主公
  vm.$refs = {}; // 一个对象，持有注册过 ref attribute 的所有 DOM 元素和组件实例。

  // 以 _ 开头，是其内部属性
  vm._watcher = null; // 该组件的渲染函数对应的 Wathcer
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false; // 表示是否初次渲染过的标识
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false; // 是否开始进行销毁组件操作
}

// 为 Vue 原型添加 _update、$forceUpdate、$destroy 方法，与组件渲染相关
export function lifecycleMixin(Vue: Class<Component>) {
  /** 根据 Vnode 渲染 DOM，如果存在旧 Vnode，则进入 diff 阶段
   * 最主要的就是 __patch__，__patch__ 方法依据不同平台注入，web 端的在 /platforms/web/runtime/index.js
   * 但是最终会执行 \core\vdom\patch.js 中的最后的 patch 方法，根据 vnode 渲染成 DOM。
   *  详见 path 方法注解
   */
  Vue.prototype._update = function(vnode: VNode, hydrating?: boolean) {
    const vm: Component = this;
    const prevEl = vm.$el; // 上一个生成的 DOM
    const prevVnode = vm._vnode; // 上一个 Vnode
    const restoreActiveInstance = setActiveInstance(vm); // 将 vm 设为 正在渲染的组件引用
    vm._vnode = vnode; // 保持 vm._vnode 指向正在渲染的 vnode
    // Vue.prototype.__patch__ is injected in entry points  Vue.prototype.__patch__ 在入口点注入
    // based on the rendering backend used. 基于所使用的渲染后端
    // __patch__ 方法依据不同平台注入，web 端的在 /platforms/web/runtime/index.js
    if (!prevVnode /** 如果不存在上一个 Vnode，表示为初始化阶段 */) {
      // initial render 初始渲染
      // 将渲染成的 DOM 挂载到 $el 上
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates 更新阶段，到这一步，与初始阶段步骤相同，接下来的对比工具将 __path__ 方法
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    // 将正在渲染的组件引用回到上一个
    restoreActiveInstance();
    // update __vue__ reference 更新 __vue__ 引用
    if (prevEl) {
      prevEl.__vue__ = null; // 将上一个 __vue__ 引用置为 null
    }
    // 保持当前 __vue__ 引用
    if (vm.$el) {
      vm.$el.__vue__ = vm;
    }
    // if parent is an HOC, update its $el as well 如果父项是HOC，则也更新其$el
    // vm.$vnode：组件表示的 vnode -- vm.$parentvm.$parent：父组件实例 -- _vnode：整个组件的 vnode
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el;
    }
    // updated hook is called by the scheduler to ensure that children are 调度程序调用更新的钩子以确保
    // updated in a parent's updated hook. 在父对象的更新挂钩中更新
  };

  Vue.prototype.$forceUpdate = function() {
    const vm: Component = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function() {
    const vm: Component = this;
    if (vm._isBeingDestroyed) {
      return;
    }
    callHook(vm, 'beforeDestroy');
    vm._isBeingDestroyed = true;
    // remove self from parent
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    let i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--;
    }
    // call the last hook...
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, 'destroyed');
    // turn off all instance listeners.
    vm.$off();
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null;
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null;
    }
  };
}

/**
 * 渲染组件方法：
 *  生成 updateComponent 方法，执行 vm._render()[生成 Vnode] 和 vm._update()[对 Vnode 进行更新渲染]
 *      -- vm._render() 在 ./render.js 文件中
 *      -- vm._update() 定义在该文件上方，对新旧 Vnode 对比
 *  生成 Watcher 实例解析 updateComponent 表达式，这样的话在依赖项变更时就会重新执行 updateComponent 方法生成新的 Vnode 和 进行补丁
 *  在创建 Wathcer 实例时，初始阶段就会进行解析表达式，这样就会初始挂载一次，后续就是更新阶段了
 *
 * 更新阶段：
 *  updateComponent 就会被执行
 *      -- vm._render() 方法执行步骤与初始阶段也相同
 *      -- vm.update() 如果遇到存在旧 vnode，就会通过 __path__ 进入 diff 阶段，进行更新
 */
export function mountComponent(
  vm: Component, // 组件实例
  el: ?Element, // 挂载点
  hydrating?: boolean // ??
): Component {
  vm.$el = el; // 挂载点 - 如果不会传入，那么就会将生成的 DOM 挂载到 $el 上，如果传入，最终会将生成的 DOM 替换成 el
  // 如果不存在 render 函数的话
  if (!vm.$options.render) {
    // 替换成一个生成一个空的文本 VNode 的方法
    vm.$options.render = createEmptyVNode;
    // 在开发环境下，如果不存在 render 函数，就报错提示
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if (
        (vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el ||
        el
      ) {
        warn(
          'You are using the runtime-only build of Vue where the template ' + // 您使用的是仅运行时版本的Vue，其中模板
          'compiler is not available. Either pre-compile the templates into ' + // 编译器不可用。或者将模板预编译为
            'render functions, or use the compiler-included build.', // 渲染函数，或使用包含在生成中的编译器
          vm
        );
      } else {
        warn(
          'Failed to mount component: template or render function not defined.', // 装载组件失败：未定义模板或呈现函数
          vm
        );
      }
    }
  }
  // 执行 beforeMount 生命周期钩子
  callHook(vm, 'beforeMount');

  // 更新组件方法(第一次为初始挂载阶段)
  let updateComponent;
  /* istanbul ignore if */
  // 如果需要性能追踪的话，就需要 计算 VNode 生成性能 和 VNode 渲染 DOM 性能
  // 最终 updateComponent 方法主要做两个工作，调用 vm._render() 生成 VNode，调用 vm._update 传入 VNode 进行渲染 DOM
  // vm._render() 在 ./render.js 文件中
  // vm._update() 定义在该文件上方
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name;
      const id = vm._uid;
      const startTag = `vue-perf-start:${id}`;
      const endTag = `vue-perf-end:${id}`;

      mark(startTag);
      const vnode = vm._render(); // 生成 VNode
      mark(endTag);
      measure(`vue ${name} render`, startTag, endTag);

      mark(startTag);
      vm._update(vnode, hydrating); // 生成真实 DOM
      mark(endTag);
      measure(`vue ${name} patch`, startTag, endTag);
    };
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating);
    };
  }

  // we set this to vm._watcher inside the watcher's constructor 我们将其设置为 vm._watcher 的构造函数中的观察者
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child 因为观察者的初始补丁可能会调用 $forceUpdate（例如，在child 内部
  // component's mounted hook), which relies on vm._watcher being already defined 组件的挂载挂钩），这取决于已经定义好了 vm._watcher
  // 生成 Wathcer 观察者，在创建阶段，就会调用 updateComponent 方法执行初始化，然后在 updateComponent 依赖改变时会执行更新阶段流程
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      // 在更新前执行钩子(不包括初始化过程)
      before() {
        if (
          vm._isMounted /** 是否已经挂载过 */ &&
          !vm._isDestroyed /** 是否没有被渲染 */
        ) {
          // 执行 beforeUpdate 钩子 -- 因为在执行 Watcher 队列时，会先执行父组件的 before 钩子，所以父组件先执行 beforeUpdate 生命周期
          callHook(vm, 'beforeUpdate');
        }
      },
    },
    true /* isRenderWatcher */ // 表示为渲染函数的 Wathcer，然后就会该 Wathcer 添加到 vm 实例上，即 vm._watcher
  );
  hydrating = false;

  // manually mounted instance, call mounted on self 手动装入实例，调用自行装入
  // mounted is called for render-created child components in its inserted hook 在插入的钩子中为渲染创建的子组件调用mounted
  // 如果是 vm.$vnode 为空的话，表示是根组件，如果是子组件的话，$vnode 引用的是表示组件类型的 vnode
  if (vm.$vnode == null) {
    vm._isMounted = true; // 是否渲染标识置为 true
    // 执行 mounted 钩子
    callHook(vm, 'mounted');
  }
  return vm;
}

/**
 * 更新子组件 Vnode，当父组件注入子组件的 props、attrs、event、插槽等改变时，就会触发这个方法
 *  1. 插槽：
 *      因为插槽没有进行响应式，所以我们最后会判断插槽是否改变了，改变就手动调用 vm.$forceUpdate() 方法执行子组件的更新
 *  2. attrs：
 *      直接重新赋值 vm.$attrs，因为 $attrs 属性是响应式的，所以会触发子组件重新渲染
 */
export function updateChildComponent(
  vm: Component, // 组件实例
  propsData: ?Object, // 更新注入的 props
  listeners: ?Object, // 更新注入的 listeners 事件
  parentVnode: MountedComponentVNode, // 新的组件类型 Vnode
  renderChildren: ?Array<VNode> // 。。
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true; // 标识正在更新子组件
  }

  // determine whether component has slot children 确定组件是否具有插槽子级
  // we need to do this before overwriting $options._renderChildren. 我们需要在覆盖$options之前执行此操作 $options._renderChildren。

  // check if there are dynamic scopedSlots (hand-written or compiled but with 检查是否存在动态scopedSlots（手写或编译，但使用
  // dynamic slot names). Static scoped slots compiled from template has the 动态插槽名称）。从模板编译的静态作用域插槽具有
  // "$stable" marker. “$stable”标记
  const newScopedSlots = parentVnode.data.scopedSlots;
  const oldScopedSlots = vm.$scopedSlots;
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  );

  // Any static slot children from the parent may have changed during parent's 来自父级的任何静态插槽子级在父级的
  // update. Dynamic scoped slots may also have changed. In such cases, a forced 使现代化动态作用域插槽也可能已更改。在这种情况下，必须采取强制措施
  // update is necessary to ensure correctness. 必须进行更新以确保正确性
  const needsForceUpdate = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    hasDynamicScopedSlot
  );

  // 让 vm.$options._parentVnode、vm.$vnode 这两个引用至新的组件类型 Vnode
  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render 更新vm的占位符节点而不重新渲染

  if (vm._vnode) {
    // update child tree's parent 更新子树的父树
    vm._vnode.parent = parentVnode;
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash 更新 $attrs 和 $listeners 哈希
  // these are also reactive so they may trigger child update if the child 这些也是反应性的，因此如果子系统发生故障，它们可能会触发子系统更新
  // used them during render 在渲染期间使用它们
  /**
   * $attrs、$listeners：这两个我们直接从组件类型 Vnode.data.attrs 和 vnode.componentOptions.listeners 中提取出新的值
   * 为什么可以触发更新？
   *  因为这两个属性也是响应式的，在 core\instance\render.js 文件中的 initRender 中会添加这两个属性为响应式的
   */
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props 更新 props
  /**
   * 因为 props 是每个 prop 注入到 vm 实例上的，所以我们需要遍历处理 -- props 也是使用频率比较高的
   *  从新的 propsData 中提取出新的 prop 注入到 vm._props 中，因为 vm._props 也是响应式的，在 core\instance\state.js 的 initProps 方法响应式的
   *  所以当 prop 改变是，就会触发子组件更新
   */
  if (propsData && vm.$options.props) {
    toggleObserving(false); // 不要进行响应式，因为此时 props 不需要深度响应式
    const props = vm._props; // 最终 props 的值，都保存在 vm._props
    // 在组件初始化时，props 会将 props 的 key 缓存到 _propKeys 属性上
    const propKeys = vm.$options._propKeys || [];
    // 遍历 propKey
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i];
      const propOptions: any = vm.$options.props; // wtf flow?
      // 从父组件注入的 prop 或 配置的默认值 中提取出 prop 值，然后添加到 props 中
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
    toggleObserving(true);
    // keep a copy of raw propsData 保留一份原始的propsData
    vm.$options.propsData = propsData;
  }

  // update listeners 更新事件
  // 上面事件 $listeners 属性重新赋值(如果改变的话)会触发子组件 Watcher 类的更新，但这个更新是异步操作
  // 所以在这里进行更新事件的另外加工封装
  listeners = listeners || emptyObject;
  const oldListeners = vm.$options._parentListeners;
  vm.$options._parentListeners = listeners;
  // 新旧事件的更新
  updateComponentListeners(vm, listeners, oldListeners);

  // resolve slots + force update if has children 解决插槽+强制更新（如果有子项）
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false;
  }
}

function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true;
  }
  return false;
}

export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false;
    if (isInInactiveTree(vm)) {
      return;
    }
  } else if (vm._directInactive) {
    return;
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false;
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'activated');
  }
}

export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true;
    if (isInInactiveTree(vm)) {
      return;
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'deactivated');
  }
}

/**
 * 执行生命周期钩子：
 *   1. 执行在 $options 中的钩子列表，通过 invokeWithErrorHandling 方法调用即可
 *   2. 如果存在通过 $on 方式侦听的生命周期钩子的话，通过 $emit 方式调用即可
 */
export function callHook(vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks 调用生命周期挂钩时禁用dep收集
  pushTarget();
  const handlers = vm.$options[hook]; // 提取出指定钩子调用集合
  const info = `${hook} hook`;
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      // 通过 invokeWithErrorHandling 方法调用，主要会捕获调用过程的错误
      invokeWithErrorHandling(handlers[i], vm, null, vm, info);
    }
  }
  if (vm._hasHookEvent /** 如果存在通过 $on 方式侦听的生命周期钩子的话 */) {
    vm.$emit('hook:' + hook); // 通过 $emit 方式调用
  }
  popTarget(); // 恢复依赖收集
}
