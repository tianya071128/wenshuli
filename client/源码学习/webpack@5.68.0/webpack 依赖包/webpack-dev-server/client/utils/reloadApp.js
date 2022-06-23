import hotEmitter from "webpack/hot/emitter.js";
import { log } from "./log.js";
/** @typedef {import("../index").Options} Options
/** @typedef {import("../index").Status} Status

/**
 * 这个文件主要处理重新加载应用:
 *  1. 如果不支持 hot 的话，策略如下：
 *      只要支持 liveReload 功能(默认支持)，那么就会调用 location.reload() 方法刷新页面
 *  2. 如果支持 hot 的话，策略如下：
 *      通过 hotEmitter 发送 webpackHotUpdate 事件，并传递编译 hash 参数，此时就会交给 webapck/hot/dev-server.js 进行处理进行 hot
 */   

/**
 * @param {Options} options
 * @param {Status} status
 */

function reloadApp(_ref, status) {
  var hot = _ref.hot, // 是否支持 hot 
      liveReload = _ref.liveReload; // 是否支持 liveReload

  // status.isUnloading：在应用卸载前会被置为 true，此时就不要做其他处理
  if (status.isUnloading) {
    return;
  }

  var currentHash = status.currentHash, // 当次编译的 hash
    previousHash = status.previousHash; // 上次编译的 hash
  // 两个 hash 是否没有变化
  var isInitial = currentHash.indexOf( 
  /** @type {string} */
  previousHash) >= 0;

  // 如果 hash 没有变化，那么就不处理
  if (isInitial) {
    return;
  }
  /**
   * @param {Window} rootWindow
   * @param {number} intervalId
   */


  function applyReload(rootWindow, intervalId) {
    clearInterval(intervalId); // 清除定时器
    log.info("App updated. Reloading..."); // 应用程序更新。重新加载
    rootWindow.location.reload(); // 直接调用 reload 方法重新加载
  }

  var search = self.location.search.toLowerCase(); // 应用的 URL
  var allowToHot = search.indexOf("webpack-dev-server-hot=false") === -1; // 是否不包含 webpack-dev-server-hot=false
  var allowToLiveReload = search.indexOf("webpack-dev-server-live-reload=false") === -1; // 是否不包含 webpack-dev-server-live-reload=false

  if (hot && allowToHot) {
    // 这里是开启了 hot 功能，那么就走 hot 策略
    log.info("App hot update...");
    hotEmitter.emit("webpackHotUpdate", status.currentHash);

    if (typeof self !== "undefined" && self.window) {
      // broadcast update to window 窗口广播更新
      self.postMessage("webpackHotUpdate".concat(status.currentHash), "*");
    }
  } // allow refreshing the page only if liveReload isn't disabled 只有在live Reload未被禁用的情况下才允许刷新页面
  else if (liveReload && allowToLiveReload) {
    // 这里是没有开启 hot，但是启用了 liveReload 功能
    var rootWindow = self; // use parent window for reload (in case we're in an iframe with no valid src) 使用父窗口重新加载(以防我们在一个没有有效src的iframe中)

    var intervalId = self.setInterval(function () {
      if (rootWindow.location.protocol !== "about:") {
        // reload immediately if protocol is valid 如果协议有效，则立即重新加载
        applyReload(rootWindow, intervalId);
      } else {
        rootWindow = rootWindow.parent;

        if (rootWindow.parent === rootWindow) {
          // if parent equals current window we've reached the root which would continue forever, so trigger a reload anyways 如果父窗口等于当前窗口，我们已经到达了将永远持续下去的根窗口，所以无论如何都会触发重新加载
          applyReload(rootWindow, intervalId);
        }
      }
    });
  }
}

export default reloadApp;