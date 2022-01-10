/* @flow */
/* globals MutationObserver */
// 主要实现 nextTick 方法
import { noop } from 'shared/util';
import { handleError } from './error';
import { isIE, isIOS, isNative } from './env';

export let isUsingMicroTask = false; // 是否支持微任务(Promise、MutationObserver)

const callbacks = []; // 需要延迟执行的回调队列
let pending = false; // 是否启动了一次更新队列

// 执行回调队列
function flushCallbacks() {
  pending = false; // 标识
  const copies = callbacks.slice(0); // 复制回调副本
  callbacks.length = 0; // 清空队列
  for (let i = 0; i < copies.length; i++) {
    copies[i](); // 遍历执行
  }
}

// Here we have async deferring wrappers using microtasks. 这里我们有使用微任务的异步延迟包装器
// In 2.5 we used (macro) tasks (in combination with microtasks). 在2.5中，我们使用了（宏）任务（与微任务结合使用）
// However, it has subtle problems when state is changed right before repaint 然而，当状态在重新绘制之前更改时，它会有一些微妙的问题
// (e.g. #6813, out-in transitions). （例如 #6813，out-in transitions）
// Also, using (macro) tasks in event handler would cause some weird behaviors 此外，在事件处理程序中使用（宏）任务会导致一些奇怪的行为
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109). 这是无法规避的（例如 #7109、#7153、#7546、#7834、#8109）。
// So we now use microtasks everywhere, again. 所以我们现在到处都使用微任务。
// A major drawback of this tradeoff is that there are some scenarios 这种权衡的一个主要缺点是存在一些场景
// where microtasks have too high a priority and fire in between supposedly 如果微任务的优先级太高，则可能会在两者之间触发
// sequential events (e.g. #4521, #6690, which have workarounds) 顺序事件（例如#4521、#6690，有解决办法）
// or even between bubbling of the same event (#6566). 甚至在同一事件的泡沫之间。

// 添加 timerFunc 方法添加至任务队列中，首先尝试使用 Promise -> MutationObserver -> setImmediate -> setTimeout。前两个为微任务队列
// 当启动 timerFunc 方法时，会将 flushCallbacks 回调添加至任务队列中(微任务或宏任务)
let timerFunc;

// The nextTick behavior leverages the microtask queue, which can be accessed nextTick行为利用可以访问的微任务队列
// via either native Promise.then or MutationObserver. 通过任何一个原生 Promise。然后是 MutationObserver。
// MutationObserver has wider support, however it is seriously bugged in MutationObserver得到了更广泛的支持，但是它被严重地窃听了
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It 在触摸事件处理程序中触发时，iOS中的UIWebView>=9.3.3。使用
// completely stops working after triggering a few times... so, if native 触发几次后完全停止工作。。。所以，如果是原生
// Promise is available, we will use it: 承诺可用，我们将使用它：
/* istanbul ignore next, $flow-disable-line */
// 检测是否支持原生 Promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve(); // 建立一个成功态 Promise
  // 添加任务使用 Promise
  timerFunc = () => {
    p.then(flushCallbacks);
    // In problematic UIWebViews, Promise.then doesn't completely break, but 在Web视图中，承诺。然后不会完全破裂，但是
    // it can get stuck in a weird state where callbacks are pushed into the 它可能陷入一种奇怪的状态，回调被推到
    // microtask queue but the queue isn't being flushed, until the browser 微任务队列，但在浏览器启动之前，不会刷新队列
    // needs to do some other work, e.g. handle a timer. Therefore we can 需要做一些其他工作，例如处理计时器。因此，我们可以
    // "force" the microtask queue to be flushed by adding an empty timer. 通过添加空计时器“强制”刷新微任务队列。
    if (isIOS) setTimeout(noop); // 兼容 ios 的问题，见注解
  };
  isUsingMicroTask = true; // 是否为微任务
} else if (
  !isIE && // 不是 IE 环境
  typeof MutationObserver !== 'undefined' && // 支持原生 MutationObserver 环境
  (isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]')
) {
  // Use MutationObserver where native Promise is not available, 在本机承诺不可用的情况下使用MutationObserver，
  // e.g. PhantomJS, iOS7, Android 4.4 例如PhantomJS、iOS7、Android 4.4
  // (#6466 MutationObserver is unreliable in IE11) （#6466 MutationObserver在IE11中不可靠）
  let counter = 1;
  const observer = new MutationObserver(flushCallbacks);
  const textNode = document.createTextNode(String(counter)); // 创建一个文本节点，通过改变这个文本节点来触发回调执行
  // 检测文本节点
  observer.observe(textNode, {
    characterData: true,
  });
  // 添加任务回调 -- 原理就是改变上面文本节点的内容，从而触发回调发生
  timerFunc = () => {
    counter = (counter + 1) % 2;
    textNode.data = String(counter);
  };
  isUsingMicroTask = true; // 是否为微任务
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate. 退回到setImmediate。
  // Technically it leverages the (macro) task queue, 从技术上讲，它利用了（宏）任务队列，
  // but it is still a better choice than setTimeout. 但它仍然是比setTimeout更好的选择。
  timerFunc = () => {
    setImmediate(flushCallbacks);
  };
} else {
  // Fallback to setTimeout. 回退到设置超时
  timerFunc = () => {
    setTimeout(flushCallbacks, 0);
  };
}

// nextTick 方法：简单将就是将 cb 或 Promise 成功态封装一下推入到回调队列中，然后通过 timerFunc 方法添加到任务队列中
// 恰当的时机后执行这些回调
export function nextTick(cb?: Function, ctx?: Object) {
  let _resolve;
  // 向 callbacks 回调队列中添加回调(这个回调封装了 cb)
  callbacks.push(() => {
    if (cb /** 如果传入了回调的话 */) {
      try {
        cb.call(ctx); // 则执行用户传入的回调
      } catch (e) {
        handleError(e, ctx, 'nextTick'); // 回调执行存在异常时执行方法
      }
    } else if (_resolve /** 如果没有传入回调，但是支持 Promise 环境 */) {
      _resolve(ctx); // Promise -- 成功态
    }
  });
  // 如果没有开始启动的话
  if (!pending) {
    pending = true;
    timerFunc(); // 启动队列，添加微任务(或宏任务)执行回调
  }
  // $flow-disable-line
  // 当没有传入 cb 回调，并且支持 Promise
  if (!cb && typeof Promise !== 'undefined') {
    // 那么返回 Promise
    return new Promise((resolve) => {
      _resolve = resolve; // 将 _resolve 赋值为 resolve，这样的话，在上面封装的部分中，开始执行回调的话，就会执行 _resolve 方法
    });
  }
}
