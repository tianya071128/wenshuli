/* @flow */

import { warn, invokeWithErrorHandling } from 'core/util/index';
import { cached, isUndef, isTrue, isPlainObject } from 'shared/util';

// 规范化事件名名称
const normalizeEvent = cached(
  (
    name: string
  ): {
    name: string,
    once: boolean,
    capture: boolean,
    passive: boolean,
    handler?: Function,
    params?: Array<any>,
  } => {
    // 对应 addEventListener 中的 passive 选项 -- 在渲染成 VNode 的过程中是以开头 & 标识
    const passive = name.charAt(0) === '&'; // 如果事件名以 & 开头
    name = passive ? name.slice(1) : name; // 截取掉 & 字符
    // 只执行一次
    const once = name.charAt(0) === '~'; // Prefixed last, checked first 最后加前缀，首先选中
    name = once ? name.slice(1) : name;
    // 使用事件捕获模式
    const capture = name.charAt(0) === '!';
    name = capture ? name.slice(1) : name;
    // 返回
    return {
      name,
      once,
      capture,
      passive,
    };
  }
);

/**
 * 封装函数调用程序 -- 在这里会作如下两个重要封装：
 *  1. 封装函数调用，将其可以捕获其调用错误问题。
 *  2. 将函数挂载到返回函数的 fns 属性上，这样可以很方便的添加、移除、替换等操作
 */
export function createFnInvoker(
  fns: Function | Array<Function>,
  vm: ?Component
): Function {
  // 真正的调用方法 -- 内部调用也简单，取出 invoker.fns 依次调用即可
  function invoker() {
    const fns = invoker.fns;
    if (Array.isArray(fns) /** 如果是数组，遍历调用 */) {
      const cloned = fns.slice();
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`);
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`);
    }
  }
  // 将其程序添加到 fns 属性上，这样有新增程序时，直接将其添加到 fns 属性上就可以
  // 例如替换掉程序的话，直接替换 fns 函数即可，这样我们只需要封装一次
  invoker.fns = fns;
  return invoker;
}

/**
 * 通过比对更新处理程序列表，这里将只关注封装处理程序，将其新增、移除等具体逻辑通过回调让其外部决定
 * 添加逻辑: 事件添加的技巧厉害
 *  1. 如果新事件存在, 而旧事件不存在, 并且这个新事件没有经过内部封装处理, 此时通过 createFnInvoker 方法封装一层
 *      -> 封装的逻辑: 返回一个新函数, 这个函数的 fns 属性引用着真实调用事件, 返回的新函数内部逻辑就是取出 fns 属性引用的事件进行调用
 *      -> 通过操作这个 fns 引用, 可以很方便的实现事件的替换
 *  2. 当新旧事件都存在并且不相同时, 我们只需要改变封装函数 fns 引用即可
 */
export function updateListeners(
  on: Object, // 新事件
  oldOn: Object, // 旧事件
  add: Function, // 添加方法
  remove: Function, // 删除方法
  createOnceHandler: Function, // 只执行一次事件添加方法
  vm: Component // 组件实例
) {
  let name, def, cur, old, event;
  // 遍历新事件集合
  for (name in on) {
    // 当前事件和旧事件
    def = cur = on[name];
    old = oldOn[name];
    // 规范化后的事件名参数对象
    event = normalizeEvent(name);
    /* istanbul ignore if */
    // Weex 环境
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler;
      event.params = def.params;
    }
    if (isUndef(cur) /** 如果当前事件不存在，则发出错误警告 */) {
      process.env.NODE_ENV !== 'production' &&
        warn(
          `Invalid handler for event "${event.name}": got ` + String(cur), // 事件的处理程序无效
          vm
        );
    } else if (isUndef(old) /** 如果旧事件不存在，新事件存在 */) {
      /** 如果 fns 调用列表不存在，说明是新增事件类型，那么就需要进一步封装这个处理程序 */
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm); // 封装调用程序
      }
      if (isTrue(event.once) /** 如果是只调用一次的程序 */) {
        // 调用传入的创建方法 -- 需要进一步封装调用的方法
        cur = on[name] = createOnceHandler(event.name, cur, event.capture);
      }
      // 添加方法
      add(event.name, cur, event.capture, event.passive, event.params);
    } else if (
      cur !== old // 如果新旧处理程序不同, 此时旧事件存在的话就一定是已经封装过了的
    ) {
      old.fns = cur; // 直接改变 fns 的指针即可替换
      on[name] = old;
    }
  }
  // 遍历旧处理程序
  for (name in oldOn) {
    // 如果旧处理程序存在,新的不存在
    if (isUndef(on[name])) {
      event = normalizeEvent(name);
      // 进行移除回调
      remove(event.name, oldOn[name], event.capture);
    }
  }
}
