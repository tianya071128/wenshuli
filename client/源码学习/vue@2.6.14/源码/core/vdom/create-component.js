/* @flow */

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

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  init(vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      const child = (vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      ));
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },

  prepatch(oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions;
    const child = (vnode.componentInstance = oldVnode.componentInstance);
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    );
  },

  insert(vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode;
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true;
      callHook(componentInstance, 'mounted');
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance);
      } else {
        activateChildComponent(componentInstance, true /* direct */);
      }
    }
  },

  destroy(vnode: MountedComponentVNode) {
    const { componentInstance } = vnode;
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy();
      } else {
        deactivateChildComponent(componentInstance, true /* direct */);
      }
    }
  },
};

const hooksToMerge = Object.keys(componentVNodeHooks);

/**
 * 生成表示组件的 Vnode -- 其中可能是普通子组件、函数式组件、异步组件等类型组件
 */
export function createComponent(
  Ctor: Class<Component> | Function | Object | void, // 组件配置项
  data: ?VNodeData, // 数据对象
  context: Component, // 渲染的上下文组件实例
  children: ?Array<VNode>, // 子节点(一般作为插槽)
  tag?: string
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
  let asyncFactory;
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor;
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(asyncFactory, data, context, children, tag);
    }
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

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag);

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children);
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on;
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn;

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot;
    data = {};
    if (slot) {
      data.slot = slot;
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data);

  // return a placeholder vnode
  const name = Ctor.options.name || tag;
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    {
      Ctor,
      propsData,
      listeners,
      tag,
      children,
    },
    asyncFactory
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

export function createComponentInstanceForVnode(
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any
): Component {
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent,
  };
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render;
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  return new vnode.componentOptions.Ctor(options);
}

function installComponentHooks(data: VNodeData) {
  const hooks = data.hook || (data.hook = {});
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i];
    const existing = hooks[key];
    const toMerge = componentVNodeHooks[key];
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
    }
  }
}

function mergeHook(f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
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
