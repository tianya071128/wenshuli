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
  /**
   * _inactive 和 _directInactive 变量都是在缓存组件中使用的
   *  可能存在嵌套 keep-alive 的情况，例如在外层 keep-alive 缓存组件失活情况下，内层的 keep-alive 缓存的组件即使是激活状态，那么也没有必要执行 activated 钩子，当成失活状态即可
   *
   * _inactive：表示这个实例不在活动树中(即游离于 DOM 树之外)
   * _directInactive：只会在缓存组件打上这个标识，这个标识就是用来表示这个组件在所属的 keep-alive 的状态，而不关心嵌套 keep-alive 的情况
   */
  vm._inactive = null; // 该 Vnode 是否为独立的(大概表示为游离在 DOM 树之外的)
  vm._directInactive = false; // true：表示为失活状态 | false：激活状态
  vm._isMounted = false; // 表示是否初次渲染过的标识
  vm._isDestroyed = false; // 组件被销毁标识
  vm._isBeingDestroyed = false; // 开始销毁组件标识
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

  /**
   * 组件销毁最终都会执行这个方法
   *  1. 执行 beforeDestroy 生命周期
   *  2. 从父组件的 $children 集合中删除自己, 保持 $children 集合正确
   *  3. 删除组件的 Watcher, 这样的话即使响应式数据改变, 该 Watcher 也不再会进行更新
   *  4. vm._data.__ob__.vmCount--???
   *  5. 通过 vm.__patch__(vm._vnode, null)[最终会调用 patch] 方法, 执行组件元素的卸载
   *      -> 注意点1: 当是 Vnode 的销毁, 在 removeVnodes 方法中也会执行元素的卸载, 但是如果手动调用 $destroy 方法的话, 就需要借助 vm.__patch__ 去卸载了
   *      -> 注意点2: 调用这个方法, 也可以让组件元素执行一遍 ref、directives 模块的 destroy 钩子，处理善后工作
   *  6. 执行 destroyed 钩子
   *  7. 通过 vm.$off() 关闭所有的实例侦听器
   *  8. 一些引用清空
   */
  Vue.prototype.$destroy = function() {
    const vm: Component = this;
    // 如果已经开始销毁组件, 不要重复销毁
    if (vm._isBeingDestroyed) {
      return;
    }
    // 执行 beforeDestroy 生命周期
    callHook(vm, 'beforeDestroy');
    vm._isBeingDestroyed = true;
    // remove self from parent 从父对象中删除自己
    // 从父组件的 $children 集合中删除自己, 保持 $children 集合正确
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    // teardown watchers 拆卸观察者
    // 删除组件的 Watcher, 这样的话即使响应式数据改变, 该 Watcher 也不再会进行更新
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    let i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }

    // remove reference from data ob 从数据对象中删除引用
    // frozen object may not have observer. 冻结对象可能没有观察者。
    if (vm._data.__ob__) {
      // ??? 有何用? -- 在源码上,只有在 Set 和 Del 上存在作用
      vm._data.__ob__.vmCount--;
    }
    // call the last hook... 调用最后一个钩子
    vm._isDestroyed = true; // 销毁完成标识
    // invoke destroy hooks on current rendered tree 在当前渲染树上调用销毁挂钩
    // 通过 __patch__(最终会调用 patch) 方法, 执行组件元素的卸载
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, 'destroyed'); // 执行 destroyed 钩子
    // turn off all instance listeners. 关闭所有实例侦听器
    vm.$off(); // 关闭所有的实例侦听器
    // remove __vue__ reference 删除 __vue__ 参考
    if (vm.$el) {
      vm.$el.__vue__ = null;
    }
    // release circular reference (#6759) 发布循环引用
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
 *      - 应该是部分插槽不会进行响应式的，详见 06.插槽.html 注解以及代码具体注释
 *  2. attrs：
 *      直接重新赋值 vm.$attrs，因为 $attrs 属性是响应式的，所以 $attrs 属性改变的话子组件就会触发更新(如果子组件依赖了 $attrs 属性的话)
 *  3. listeners:
 *      与 attrs 类似, 直接重新赋值 vm.$listeners。但是有一点不同的是，事件还需要进行进一步封装，通过 updateComponentListeners 方法进行新旧事件的更新
 *  4. props:
 *      因为 props 是每个 prop 注入到 vm 实例上的，所以需要遍历处理 prop.
 *      从新的 propsData 中提取出新的值赋值到 vm._props 上, 如果子组件依赖了某个 prop,并且这个 prop 也改变了的话,就会触发子组件重新更新
 *  5. 其他的 class、style、注册原生事件(使用 .native 修饰符)等数据对象, 因为这些不需要响应式, 所以当这些改变时没有必要让子组件重新渲染, 只需要更新下这些数据即可
 *      更新操作在 patchVnode(core\vdom\patch.js) 中会调用这些模块的 update 钩子进行更新
 */
export function updateChildComponent(
  vm: Component, // 组件实例
  propsData: ?Object, // 更新注入的 props
  listeners: ?Object, // 更新注入的 listeners 事件
  parentVnode: MountedComponentVNode, // 新的组件类型 Vnode
  renderChildren: ?Array<VNode> // 作为子节点的插槽(不包含作用域插槽)
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true; // 标识正在更新子组件
  }

  // determine whether component has slot children 确定组件是否具有插槽子级
  // we need to do this before overwriting $options._renderChildren. 我们需要在覆盖$options之前执行此操作 $options._renderChildren。

  // check if there are dynamic scopedSlots (hand-written or compiled but with 检查是否存在动态scopedSlots（手写或编译，但使用
  // dynamic slot names). Static scoped slots compiled from template has the 动态插槽名称）。从模板编译的静态作用域插槽具有
  // "$stable" marker. “$stable”标记
  const newScopedSlots = parentVnode.data.scopedSlots; // 新生成的作用域插槽(在 2.6.0 中，具名插槽也会生成函数式插槽)
  const oldScopedSlots = vm.$scopedSlots; // 旧的 $scopedSlots -- 在 2.6.0 中，所有的 $slots 现在都会作为函数暴露在 $scopedSlots 中。
  // $stable 标识：标识着这个作用域插槽集合是否为稳定的，即不是新增或删除插槽
  // 例如: <template v-if="defaultSlot" v-slot:jumingslot><div>{{ jumingSlot }}</div></template>
  // 这种具有 v-if 判断的，有可能前后不一样
  // 简单的讲，这里还要判断一下作用域插槽是否可能是动态的，如果是的话，我们也需要让子组件重新渲染
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) || // 如果新的作用域插槽是动态的
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) || // 或者旧的作用域插槽是动态的
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) || // 或者。。。
    (!newScopedSlots && vm.$scopedSlots.$key)
  );

  // Any static slot children from the parent may have changed during parent's 来自父级的任何静态插槽子级在父级的
  // update. Dynamic scoped slots may also have changed. In such cases, a forced 使现代化动态作用域插槽也可能已更改。在这种情况下，必须采取强制措施
  // update is necessary to ensure correctness. 必须进行更新以确保正确性
  // 只要新旧存在静态插槽或者作用域插槽是动态的，那么新需要强制子组件进行渲染
  const needsForceUpdate = !!(
    (
      renderChildren || // has new static slots 有新的静态插槽
      vm.$options._renderChildren || // has old static slots 有旧的静态插槽
      hasDynamicScopedSlot
    ) // 判断作用域插槽是否为动态的
  );

  // 让 vm.$options._parentVnode、vm.$vnode 这两个引用至新的组件类型 Vnode
  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render 更新vm的占位符节点而不重新渲染

  if (vm._vnode) {
    // update child tree's parent 更新子树的父树
    vm._vnode.parent = parentVnode; // 这个标识着这是组件的根 Vnode（不管是元素类型还是组件类型）的，引用着表示这个组件类型 Vnode
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash 更新 $attrs 和 $listeners 哈希
  // these are also reactive so they may trigger child update if the child 这些也是反应性的，因此如果子系统发生故障，它们可能会触发子系统更新
  // used them during render 在渲染期间使用它们
  /**
   * $attrs、$listeners：这两个我们直接从组件类型 Vnode.data.attrs 和 vnode.componentOptions.listeners 中提取出新的值
   * 为什么可以触发更新？
   *  因为这两个属性是响应式的，在 core\instance\render.js 文件中的 initRender 中会添加这两个属性为响应式的
   *  当渲染函数依赖了这两个属性时,就会进行子组件的更新
   */
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props 更新 props
  /**
   * 因为 props 是每个 prop 注入到 vm 实例上的，所以我们需要遍历处理 -- props 也是使用频率比较高的
   *  从新的 propsData 中提取出新的 prop 注入到 vm._props 中，因为 vm._props 也是响应式的，在 core\instance\state.js 的 initProps 方法响应式的
   *  所以当 prop 改变时，就会触发依赖改变
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
      /**
       * 在这里, 如果 prop 值没有发生改变的话, 就算这样直接赋值, 也不会触发依赖变更, 因为在 Object.defineProperty 的 setter 方法中, 会检测值是否发生改变
       */
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
    // 只要重新生成 $slots，因为 vm.$scopedSlots 中的依赖属性都是被收集到子组件中
    // 在内部子组件的 _render 渲染过程中，会重新生成 vm.$scopedSlots
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false;
  }
}

// 检测该组件是否属于一颗独立的树(不在 DOM 树之中)
/**
 * 如果存在嵌套 keep-alive, 并且深层 keep-alive 处于失活状态，那么我们就没有必要对失活状态的 keep-alive 中缓存的组件进行生命周期的执行
 */
function isInInactiveTree(vm) {
  // 递归查找父组件
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true;
  }
  return false;
}

// 递归执行缓存组件本身及子孙组件的 activated 生命周期
export function activateChildComponent(vm: Component, direct?: boolean) {
  // 只有缓存组件本身才需要做这些工作 - 如果这个缓存组件本身都不是在活动树上的，那么就会阻止子孙组件的递归调用
  if (direct) {
    vm._directInactive = false; // 表示该组件是激活状态
    // 如果存在嵌套 keep-alive, 并且深层 keep-alive 处于失活状态，那么我们就没有必要对失活状态的 keep-alive 中缓存的组件进行生命周期的执行
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
    // 执行 activated 钩子
    callHook(vm, 'activated');
  }
}

// 递归执行缓存组件本身及子孙组件的 deactivated 生命周期
export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true; // 表示该组件处于失活状态
    // 如果存在嵌套 keep-alive, 并且深层 keep-alive 处于失活状态，那么我们就没有必要对失活状态的 keep-alive 中缓存的组件进行生命周期的执行
    if (isInInactiveTree(vm)) {
      return;
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    // 遍历子组件，
    for (let i = 0; i < vm.$children.length; i++) {
      /**
       * 我们只需要对 keep-alive 缓存的根组件进行嵌套 keep-alive 检测该 keep-alive 是否属于失活状态即可，如果失活的话，在上面就会对其进行 return
       * 先执行子组件的 deactivated 钩子，在执行父组件的
       */
      deactivateChildComponent(vm.$children[i]);
    }
    // 执行 deactivated 钩子
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
