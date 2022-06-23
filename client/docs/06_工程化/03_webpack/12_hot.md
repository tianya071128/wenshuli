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

客户端收到信息，会做出不同的策略，这一部分可查看 [源码解析]()
