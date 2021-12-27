/* @flow */
// 此文件为事件处理相关，并且处理自定义事件
import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling,
} from '../util/index';
import { updateListeners } from '../vdom/helpers/index';

/**
 * 处理了如下工作：处理组件自定义事件，自定义事件在渲染成 VNode 过程中被存储在 _parentListeners 中的
 */
export function initEvents(vm: Component) {
  // 初始化 _events：是用来存储组件内的传入的事件
  vm._events = Object.create(null);
  // 标识是否存在 hook 的事件(例如通过 this.$once('hook:beforeDestroy', () => {}) 监听生命周期的事件
  vm._hasHookEvent = false;
  // init parent attached events 初始化父附加事件
  // 父组件传入的自定义事件都存放在 _parentListeners中
  const listeners = vm.$options._parentListeners;
  // 如果父组件通过 @xxx 传入了事件的话，那么就初始化
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}

let target: any;

// 添加自定义事件 -- 通过 $on 即可
function add(event, fn) {
  target.$on(event, fn);
}

// 移除自定义事件 -- 通过 $off 即可
function remove(event, fn) {
  target.$off(event, fn);
}

// 创建只执行一次的自定义事件
// 为什么不通过 $once 执行了？ -- 在 updateListeners 中需要通过 createOnceHandler 返回执行一次的程序回调，后面才会添加程序
function createOnceHandler(event, fn) {
  const _target = target;
  // 返回封装的程序
  return function onceHandler() {
    const res = fn.apply(null, arguments); // 调用一次后
    if (res !== null) {
      // 如果返回值不为 null 的话
      _target.$off(event, onceHandler); // 移除这个事件
    }
  };
}

// 更新其组件的自定义事件，在创建和更新阶段都会调用
export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  // 指向当前组件实例
  target = vm;
  // 更新(或创建)自定义事件
  updateListeners(
    listeners, // 事件
    oldListeners || {}, // 旧事件
    add, // 添加事件方法
    remove, // 删除事件方法
    createOnceHandler, // 创建只执行一次事件回调的方法
    vm
  );
  target = undefined; // 处理完成后就重置 target
}

// 为 Vue 原型添加 $on、$once、$off、$emit 方法，提供发布-订阅者模式
export function eventsMixin(Vue: Class<Component>) {
  const hookRE = /^hook:/;
  Vue.prototype.$on = function(
    event: string | Array<string>,
    fn: Function
  ): Component {
    const vm: Component = this;
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn);
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn);
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true;
      }
    }
    return vm;
  };

  Vue.prototype.$once = function(event: string, fn: Function): Component {
    const vm: Component = this;
    function on() {
      vm.$off(event, on);
      fn.apply(vm, arguments);
    }
    on.fn = fn;
    vm.$on(event, on);
    return vm;
  };

  Vue.prototype.$off = function(
    event?: string | Array<string>,
    fn?: Function
  ): Component {
    const vm: Component = this;
    // all
    if (!arguments.length) {
      vm._events = Object.create(null);
      return vm;
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn);
      }
      return vm;
    }
    // specific event
    const cbs = vm._events[event];
    if (!cbs) {
      return vm;
    }
    if (!fn) {
      vm._events[event] = null;
      return vm;
    }
    // specific handler
    let cb;
    let i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1);
        break;
      }
    }
    return vm;
  };

  Vue.prototype.$emit = function(event: string): Component {
    const vm: Component = this;
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase();
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
            `${formatComponentName(
              vm
            )} but the handler is registered for "${event}". ` +
            `Note that HTML attributes are case-insensitive and you cannot use ` +
            `v-on to listen to camelCase events when using in-DOM templates. ` +
            `You should probably use "${hyphenate(
              event
            )}" instead of "${event}".`
        );
      }
    }
    let cbs = vm._events[event];
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      const args = toArray(arguments, 1);
      const info = `event handler for "${event}"`;
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info);
      }
    }
    return vm;
  };
}
