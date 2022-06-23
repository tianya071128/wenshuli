---
title: hot
date: 2021-10-21 15:00:00
permalink: /webpack/hot
categories: -- 工程化
  -- webpack
tags:
  - null
---

# hot

通过 `webpack-dev-server`，在本地就会生成一个 `web-socket` 服务器(一般为 `ws`)，在应用(客户端)中也会就会连接这个 `ws` 服务器，这样就可以实现客户端和本地服务端持久通信。就会通过 `ws` 服务器传递一些构建信息，客户端能够感知到构建信号(是否重新构建、重新构建是否完成、构建结果等)。

## 服务端传递的相关消息

详情可见：[`webapck-dev-server` 源码文件](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack%405.68.0/webpack%20%E4%BE%9D%E8%B5%96%E5%8C%85/webpack-dev-server/lib/Server.js)

1. 在初次构建时，在创建本地 `ws` 服务器的 `createWebSocketServer` 方法中，会初始发送一些消息，表明需要的功能：

   * 如果设置了功能 `options.hot`：发送 {"type": "hot"}
   * 如果设置了功能 `options.liveReload`：发送 {"type": "liveReload"}
   * 如果设置了功能 `options.client.progress`：发送 {"type": "progress", "data": xxx}
   * 如果设置了功能 `options.client.reconnect`：发送 {"type": "reconnect", "data": 重连次数}
   * 如果设置了功能 `options.client.overlay`：发送 {"type": "overlay", "data": overlay设置值}

2. 在开始编译的时候，会在 `compiler.hooks.invalid`(文件开始发送变化) 事件中，发送一条消息

   {"type":"invalid"}

3. 在编译完成(初次编译或重新编译)后，会通过 sendStats 方法传递消息：

   * 当次编译的 hash 值：{"type":"hash","data":"8954544ba0c760cc1f4a"}
   * 如果编译出现错误或警告，那么就将错误和警告信息发送给客户端：
     * 错误：{"type": "errors", "data": [{ loc: 错误位置(行:列), message: 错误信息, moduleName: 错误文件 }]}
     * 警告：{ "type": "warnings", "data": 与错误类似 }
   * 如果没有错误或警告，发送一条 ok 消息：{ "type": "ok" }

**以及一些其他消息，总之客户端接收到消息到会做不同的策略**

如图所示：

![image-20220623094256252](/img/140.png)

## 客户端接收到消息后的策略

客户端收到信息，会做出不同的策略，这一部分可查看 [源码解析](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack%405.68.0/webpack%20%E4%BE%9D%E8%B5%96%E5%8C%85/webpack-dev-server/client/index.js)，这些文件会被 `webpack-dev-server` 通过添加一个 entry 以注入到编译后的 chunk 中

这里主要看一下接收到编译完成后的 ok 消息：{ "type": "ok" }

```js
// 编译完成(初次编译或重新编译)时接收的消息，此时可能会实施 hot 或刷新页面
ok: function ok() {
  sendMessage("Ok");
  // 重新编译后将错误或警告遮罩消息
  if (options.overlay) {
    hide();
  }
  reloadApp(options, status); // 交由 reloadApp 处理当次逻辑
}
```

reloadApp 方法在 [`webpack-dev-server/client/utils/reloadApp` 文件中](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack%405.68.0/webpack%20%E4%BE%9D%E8%B5%96%E5%8C%85/webpack-dev-server/client/utils/reloadApp.js)，大致为：

* 不支持 hot 的话，只要支持 `liveReload` 功能(默认支持)，那么就会**调用 `location.reload()` 方法刷新页面**
* 支持 hot 的话，通过 `hotEmitter` 发送 `webpackHotUpdate` 事件，并传递编译 hash 参数，此时就会交给 `webapck/hot/dev-server.js` 进行处理 hot

```js
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
```

## hot 功能

可参考[掘金这篇文章](https://juejin.cn/post/6844904008432222215#heading-8)
