/* @flow */
// 处理错误方法集合

import config from '../config';
import { warn } from './debug';
import { inBrowser, inWeex } from './env';
import { isPromise } from 'shared/util';
import { pushTarget, popTarget } from '../observer/dep';

// 统一处理组件运行期间捕获到的错误
export function handleError(err: Error, vm: any, info: string) {
  // Deactivate deps tracking while processing error handler to avoid possible infinite rendering. 在处理错误处理程序时停用deps跟踪，以避免可能的无限渲染
  // See: https://github.com/vuejs/vuex/issues/1505
  pushTarget(); // 停止依赖收集
  try {
    if (vm) {
      let cur = vm;
      // 递归查找父组件的 errorCaptured 的钩子，用于处理错误
      while ((cur = cur.$parent)) {
        const hooks = cur.$options.errorCaptured; // 在捕获一个来自后代组件的错误时被调用。
        if (hooks) {
          for (let i = 0; i < hooks.length; i++) {
            try {
              // 执行 hook，如果返回了 false 的话，那么就不要将这个错误暴露出去
              const capture = hooks[i].call(cur, err, vm, info) === false;
              if (capture) return;
            } catch (e) {
              globalHandleError(e, cur, 'errorCaptured hook');
            }
          }
        }
      }
    }
    // 全局处理错误
    globalHandleError(err, vm, info);
  } finally {
    popTarget(); // 继续依赖收集
  }
}

/**
 * 程序调用函数 -- 如果调用期间发生错误，会尽量捕获到程序调用时的错误
 * 这也是为什么 vue 是处理一些事件的错误
 */
export function invokeWithErrorHandling(
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res;
  try {
    res = args ? handler.apply(context, args) : handler.call(context); // 调用函数
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      // 处理程序调用时错误
      res.catch((e) => handleError(e, vm, info + ` (Promise/async)`));
      // issue #9511
      // avoid catch triggering multiple times when nested calls 避免在嵌套调用时多次触发catch
      res._handled = true;
    }
  } catch (e) {
    // 如果是一些同步错误的话
    handleError(e, vm, info);
  }
  return res;
}

// 全局处理错误
function globalHandleError(err, vm, info) {
  // errorHandler： 指定组件的渲染和观察期间未捕获错误的处理函数。
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info); // 调用 errorHandler 执行
    } catch (e) {
      // if the user intentionally throws the original error in the handler, 如果用户故意在处理程序中抛出原始错误
      // do not log it twice 不要记录两次
      if (e !== err) {
        logError(e, null, 'config.errorHandler');
      }
    }
  }
  logError(err, vm, info);
}

// 打印错误
function logError(err, vm, info) {
  // 开发环境下，通过 warn 处理错误
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm);
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err); // 在浏览器或 weex 环境下，直接 console 错误
  } else {
    throw err;
  }
}
