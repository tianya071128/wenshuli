/* @flow */

import { isDef, isUndef } from 'shared/util';
import { updateListeners } from 'core/vdom/helpers/index';
import { isIE, isFF, supportsPassive, isUsingMicroTask } from 'core/util/index';
import {
  RANGE_TOKEN,
  CHECKBOX_RADIO_TOKEN,
} from 'platforms/web/compiler/directives/model';
import { currentFlushTimestamp } from 'core/observer/scheduler';

// normalize v-model event tokens that can only be determined at runtime. 规范化只能在运行时确定的 v-model 事件标记。
// it's important to place the event as the first in the array because 将事件放在数组中的第一个位置很重要，因为
// the whole point is ensuring the v-model callback gets called before 关键是要确保在调用之前调用 v-model 回调
// user-attached handlers. 用户附加的处理程序。
// 处理了事件中 v-model 事件,确保 v-model 事件最先调用 以及 一个特殊情况
function normalizeEvents(on) {
  /* istanbul ignore if */
  if (
    isDef(on[RANGE_TOKEN]) // 如果事件中具有 RANGE_TOKEN(__r) 事件, 这个事件是 v-model 事件(这个事件时内部封装的事件)
  ) {
    // IE input[type=range] only supports `change` event IE input[type=range] 仅支持'change'事件
    const event = isIE ? 'change' : 'input'; // 一般而言是 input, 但是需要额外处理 IE 情况
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || []); // 确保 v-model 事件最先调用
    delete on[RANGE_TOKEN]; // 删除
  }
  // This was originally intended to fix #4521 but no longer necessary 这原本是为了修复 #4521，但现在已经没有必要了
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4 2.5 之后。保持它与 <2.4 中生成的代码向后兼容
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
    delete on[CHECKBOX_RADIO_TOKEN];
  }
}

let target: any;

/**
 * 添加只执行一次的事件, 这实现的有点意思
 *  - 一开始还疑惑, 当重渲染的话, 事件引用都变了不会重新执行嘛
 *  - 实现原理: 当重新渲染时, 即使新旧方法引用不同, 在 updateListeners 更新事件方法内部, 只会去更改封装 fns 的引用, 此时已经通过 remove 方法删除 DOM 上的事件了, 也就不会重新触发了
 */
function createOnceHandler(event, handler, capture) {
  const _target = target; // save current target element in closure 在闭包中保存当前目标元素
  // 返回一个封装后的函数, 执行完毕后删除
  return function onceHandler() {
    const res = handler.apply(null, arguments);
    if (res !== null) {
      remove(event, onceHandler, capture, _target);
    }
  };
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp Firefox<=53（特别是ESR 52）具有不正确的事件。时间戳
// implementation and does not fire microtasks in between event propagation, so 在事件传播之间不触发微任务，因此
// safe to exclude. 可以安全排除。
const useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53); // 支持微任务 &&

// 添加事件方法 - 又是需要处理特殊情况
function add(
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {
  // async edge case #6566: inner click event triggers patch, event handler 异步边缘案例#6566：内部单击事件触发器修补程序，事件处理程序
  // attached to outer element during patch, and triggered again. This 在修补期间附加到外部元素，并再次触发。这
  // happens because browsers fire microtask ticks between event propagation. 发生这种情况是因为浏览器在事件传播之间触发微任务标记。
  // the solution is simple: we save the timestamp when a handler is attached, 解决方案很简单：我们在附加处理程序时保存时间戳，
  // and the handler would only fire if the event passed to it was fired 并且处理程序只有在传递给它的事件被激发时才会激发
  // AFTER it was attached. 在它被连接之后。
  // 。。。。。。。
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp;
    const original = handler;
    handler = original._wrapper = function (e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...
        e.target === e.currentTarget ||
        // event is fired after handler attachment
        e.timeStamp >= attachedTimestamp ||
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value
        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments);
      }
    };
  }
  // 简而言之，就是通过 addEventListener 方法添加事件
  target.addEventListener(
    name,
    handler,
    supportsPassive ? { capture, passive } : capture // 是否支持 passive 配置
  );
}

// 删除事件
function remove(
  name: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  );
}

/**
 * 初始化或更新 DOM 的事件
 *  1. 提取出新旧 Vnode.data.on 的事件集合 -- 对于组件类型 Vnode, 会在生成 Vnode 的方法中((在 core\vdom\create-component.js 的 createComponent 中)), 将作为父组件传入的事件赋值到 vnode.data.componentOption.listeners 中, 而 vnode.data.on 存放的就是作用于组件根元素的原生事件, 与元素 Vnode 一致
 *  2. 通过 updateListeners 方法比较新旧事件集合, 添加、改变、删除事件
 *     - 封装事件逻辑: 真实添加、移除方法在上方定义
 *      1. 如果新事件存在, 而旧事件不存在, 并且这个新事件没有经过内部封装处理, 此时通过 createFnInvoker 方法封装一层
 *          -> 封装的逻辑: 返回一个新函数, 这个函数的 fns 属性引用着真实调用事件, 返回的新函数内部逻辑就是取出 fns 属性引用的事件进行调用
 *          -> 通过操作这个 fns 引用, 可以很方便的实现事件的替换
 *      2. 当新旧事件都存在并且不相同时, 我们只需要改变封装函数 fns 引用即可
 *
 *     - 添加只执行一次的事件, 这实现的有点意思
 *      1. 一开始还疑惑, 当重渲染的话, 事件引用都变了不会重新执行嘛
 *      2. 实现原理: 当重新渲染时, 即使新旧方法引用不同, 在 updateListeners 更新事件方法内部, 只会去更改封装 fns 的引用, 此时已经通过 remove 方法删除 DOM 上的事件了, 也就不会重新触发了
 */
function updateDOMListeners(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果新旧 Vnode 中都不存在需要添加的事件, 那么返回
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return;
  }
  const on = vnode.data.on || {}; // 新事件
  const oldOn = oldVnode.data.on || {}; // 旧事件
  // 提取 vnode 对应的 DOM -- 如果这个 Vnode 是组件类型，vnode.elm 表示就是组件根元素 DOM，不管如何，这个 el 就是需要最终附加的 DOM
  target = vnode.elm;

  // 规范化新的事件集合 on - 处理了事件中 v-model 事件,确保 v-model 事件最先调用 以及 一个特殊情况
  normalizeEvents(on);
  /**
   * 封装事件逻辑: 真实添加、移除方法在上方定义
   *  1. 如果新事件存在, 而旧事件不存在, 并且这个新事件没有经过内部封装处理, 此时通过 createFnInvoker 方法封装一层
   *      -> 封装的逻辑: 返回一个新函数, 这个函数的 fns 属性引用着真实调用事件, 返回的新函数内部逻辑就是取出 fns 属性引用的事件进行调用
   *      -> 通过操作这个 fns 引用, 可以很方便的实现事件的替换
   *  2. 当新旧事件都存在并且不相同时, 我们只需要改变封装函数 fns 引用即可
   *
   * 添加只执行一次的事件, 这实现的有点意思
   *  - 一开始还疑惑, 当重渲染的话, 事件引用都变了不会重新执行嘛
   *  - 实现原理: 当重新渲染时, 即使新旧方法引用不同, 在 updateListeners 更新事件方法内部, 只会去更改封装 fns 的引用, 此时已经通过 remove 方法删除 DOM 上的事件了, 也就不会重新触发了
   */
  updateListeners(
    on, // 新事件集合
    oldOn, // 旧事件集合
    add, // 添加事件方法
    remove, // 删除事件方法
    createOnceHandler, // 创建只调用一次事件的方法
    vnode.context // 渲染上下文实例
  );
  target = undefined;
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners,
};
