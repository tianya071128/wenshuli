---
title: devServer
date: 2021-10-21 15:00:00
permalink: /webpack/devServer
categories: -- 工程化
  -- webpack
tags:
  - null
---

# devServer

[webpack-dev-server](https://github.com/webpack/webpack-dev-server) 可用于快速开发应用程序。

## 配置项

使用 `devServer` 配置项配置其开发环境的本地服务器行为，例如：

```js
const path = require('path');

module.exports = {
  //...
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
};
```

## devServer.devMiddleware

devServer 内部使用 [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) 提供 webpack 构建的包。

简单理解一下： [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) 内部会调用 `webpack.watch()` 进行监听并构建资源，构建的资源不会发出文件而是缓存在内存，[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) 会生成一个中间件用来代理这些构建资源

devServer.devMiddleware 是用来提供给 `webpack-dev-middleware` 的配置项，会透传到 `webpack-dev-middleware` 中

```js
module.exports = {
  devServer: {
    devMiddleware: {
      index: true,
      mimeTypes: { phtml: 'text/html' },
      publicPath: '/publicPathForDevServe',
      serverSideRender: true,
      writeToDisk: true,
    },
  },
};
```

## devServer.server - 协议

* `'http'` | `'https'` | `'spdy'(等同于 http2，使用 spdy 库实现 http2)` `string` `object`

设置服务器和配置项（默认为 'http'），可使用对象语法提供更多配置：

```js
  devServer: {
    server: {
      type: 'https', // https 协议
      options: { // 提供自签名证书
        ca: './path/to/server.pem',
        pfx: './path/to/server.pfx',
        key: './path/to/server.key',
        cert: './path/to/server.crt',
        passphrase: 'webpack-dev-server',
        requestCert: true,
      },
    },
  },
```

### devServer.https

选择使用 HTTPS 提供服务。该配置项已弃用，以支持 [devServer.server](/webpack/devServer/#协议-devserver-server)。

### devServer.http2

使用 [spdy](https://www.npmjs.com/package/spdy) 提供 HTTP/2 服务。该配置项已弃用，以支持 [devServer.server](/webpack/devServer/#协议-devserver-server)。

### 原理

原理比较简单，对于不同协议，加载不同的模块实现服务器的创建。

* http：加载 Node 的 `http` 模块
* https：加载 Node 的 `https` 模块
* http2：加载 `spdy` 库

```js
// devServer.server：允许设置服务器和配置项（默认为 'http'）
const { type, options } = /** @type {ServerConfiguration} */ (
  this.options.server
);
// 使用 node 的 http(https 等服务器模块)创建本地服务器
this.server = require(/** @type {string} */ (type)).createServer(
  options,
  this.app // express 实例，用于处理请求
);
```

## devServer.port - 端口

* `'auto'` `string` `number`

监听请求的端口号。

::: warning 注意

设置具体端口时，那么就会监听这个端口。此时如果端口号被占用，那么就会失败退出进程。

可以不设置或者设置 `auto`，此时就会自动查找一个可用的端口(默认为 8080)

:::

### 原理

* 首先根据配置提取出对应的端口号：

  ```js
  this.options.port = await Server.getFreePort(this.options.host);
  
  static async getFreePort(port, host) {
    // 设置了具体端口号，则直接使用
    if (typeof port !== "undefined" && port !== null && port !== "auto") {
      return port;
    }
    // 此时利用 p-retry 库自动获取一个可用的端口号
    const pRetry = require("p-retry");
    return pRetry(() => getPort(basePort, host), {
      retries: defaultPortRetry,
    });
  }
  ```

* 启动监听连接的服务器时传入监听的端口号

  ```js
  const listenOptions = this.options.ipc
        ? { path: this.options.ipc }
        : { host: this.options.host, port: this.options.port /** 要监听的端口号 */ };
  
  (this.server).listen(listenOptions, () => {
    resolve();
  });
  ```

## devServer.host - 域名

* `'local-ip'` | `'local-ipv4'` | `'local-ipv6'` `string`

指定要使用的 `host`，默认为 `'localhost'`：

* `'local-ip'`：将尝试将主机选项解析为您的本地 IPv4 地址（如果可用），如果 IPv4 不可用，它将尝试解析您的本地 IPv6 地址
* `'local-ipv4'`：尝试将主机选项解析为您的本地 IPv4 地址
* `local-ipv6`：将尝试将主机选项解析为您的本地 IPv6 地址。
* `'0.0.0.0'`：**服务器可以被外部访问，访问地址是 IPv4 地址**
* 不配置：会传入 `host: undefined` 到 Node 中，默认为 `0.0.0.0`，[详情见](http://nodejs.cn/api/net.html#serverlistenport-host-backlog-callback)

### 原理

与 [devServer.port](/webpack/devServer/#原理-2) 类似

* 首先根据配置提取出对应的域名：

  ```js
  this.options.host = await Server.getHostname(this.options.host);
  
  // 获取 host
  static async getHostname(hostname) {
    if (hostname === "local-ip") {
      return (
        (await Server.internalIP("v4")) ||
        (await Server.internalIP("v6")) ||
        "0.0.0.0"
      );
    } else if (hostname === "local-ipv4") {
      // 将 local-ipv4 指定为主机将尝试将主机选项解析为您的本地 IPv4 地址
      return (await Server.internalIP("v4")) || "0.0.0.0";
    } else if (hostname === "local-ipv6") {
      // 指定 local-ipv6 作为主机将尝试将主机选项解析为您的本地 IPv6 地址。
      return (await Server.internalIP("v6")) || "::";
    }
    return hostname;
  ```

* 启动监听连接的服务器时传入 host：

  ```js
  const listenOptions = this.options.ipc
        ? { path: this.options.ipc }
        : { host: this.options.host /** 监听的 host 名 */, port: this.options.port /** 要监听的端口号 */ };
  
  (this.server).listen(listenOptions, () => {
    resolve();
  });
  ```

## devServer.proxy - 代理

* `object` `[object, function]`

内部使用 [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) 库实现代理，以下为基础用法：

```js
module.exports = {
  //...
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: { '^/api': '' },
      },
    },
  },
};
```

## devServer.historyApiFallback - history路由模式

使用 `HTML5 History API` 时，可能必须提供 `index.html` 页面来代替任何 404 响应。通过将 `devServer.historyApiFallback` 设置为 true 来启用它，也就是在 `SPA` 单页应用下响应任意请求

内部使用 [connect-history-api-fallback](https://github.com/bripkens/connect-history-api-fallback) 库实现，详细配置参考库文档

```js
module.exports = {
  //...
  devServer: {
    historyApiFallback: true,
  },
  
  // 或者提供一个对象，这个对象会被传入到 connect-history-api-fallback 中
  historyApiFallback: {
      // 重写请求，匹配路径会被重写后交给其他的中间件服务处理
     	rewrites: [
        { from: /^\/$/, to: '/views/landing.html' },
        { from: /^\/subpage/, to: '/views/subpage.html' },
        { from: /./, to: '/views/404.html' },
      ],
    },
};
```

### 原理

内部是使用 [connect-history-api-fallback](https://github.com/bripkens/connect-history-api-fallback) 的，这是一个 `express` 中间件

```js
if (this.options.historyApiFallback) {
  // 中间件 - 通过指定索引页面代理请求的中间件，对于使用 HTML5 History API 的单页应用程序很有用。
  const connectHistoryApiFallback = require("connect-history-api-fallback");
  // devServer.historyApiFallback 配置项 - 会被规范化为对象形式
  const { historyApiFallback } = this.options;

  // 添加中间件
  middlewares.push({
    name: "connect-history-api-fallback",
    middleware: connectHistoryApiFallback(historyApiFallback),
  });
  
  
  /** 
   * 下面会重复添加 webpack-dev-middleware 和 express-static 中间件，是为了让 connect-history-api-fallback 中间件重写请求时重新交给上述两个中间件处理
   */
  middlewares.push({
    name: "webpack-dev-middleware",
    middleware: this.middleware,
  });
  if ((this.options.static).length > 0) {
    (this.options.static).forEach((staticOption) => {
      staticOption.publicPath.forEach((publicPath) => {
        middlewares.push({
          name: "express-static",
          path: publicPath,
          middleware: express.static(
            staticOption.directory,
            staticOption.staticOptions
          ),
        });
      });
    });
  }
}
```

::: tip 中间件顺序

在注册 `connect-history-api-fallback` 之前会先让请求通过  `webpack-dev-middleware`(处理构建资源) 和 `express-static`(处理静态目录) 中间件处理

但是 `connect-history-api-fallback` 中间件支持重写请求，所以此时需要在注册 `connect-history-api-fallback` 中间件之后重复注册 `webpack-dev-middleware`(处理构建资源) 和 `express-static`(处理静态目录) 中间件，保证能够处理重写后的请求

:::

## devServer.headers - 添加响应头

* `array` `function` `object`

为所有响应添加 headers：

```js
module.exports = {
  //...
  devServer: {
    headers: {
      'X-Custom-Foo': 'bar',
    },
  },
};
```

### 原理

原理比较简单，就是写一个 `express` 中间件，添加自定义响应头：

```js
// 需要添加响应头
if (typeof this.options.headers !== "undefined") {
  middlewares.push({
    name: "set-headers",
    path: "*", // 响应所有的请求
    middleware: this.setHeaders.bind(this), // 添加响应头字段中间件
  });
}

// 设置响应字段的中间件
setHeaders(req, res, next) {
  let { headers } = this.options; // 提取出需要添加的响应头字段列表
  if (headers) {
    /** 会先将 headers 规范化为数组形式 */
    // 遍历 headers 数组，直接添加即可
    headers.forEach(
      (header) => {
        res.setHeader(header.key, header.value);
      }
    );
  }
  next(); // 放行至下一个中间件
}
```

## devServer.compress - 压缩

* `boolean = true`

启用 [gzip compression](https://betterexplained.com/articles/how-to-optimize-your-site-with-gzip-compression/)：

```js
module.exports = {
  //...
  devServer: {
    compress: true,
  },
};
```

### 原理

内部使用 `compression` 库，这是个 express 压缩中间件：

```js
// 启用压缩 - 放在最前面，最先处理请求
if (this.options.compress) {
  const compression = require("compression");
  middlewares.push({ name: "compression", middleware: compression() });
}
```

## devServer.allowedHosts - 白名单

* `'auto'` | `'all'` `[string]`

将允许访问开发服务器的服务列入白名单：

* `'auto'`：允许 `localhost`、 [`devServer.host`](https://webpack.docschina.org/configuration/dev-server/#devserverhost) 和 [`devServer.client.webSocketURL.hostname`](https://webpack.docschina.org/configuration/dev-server/#websocketurl)

* `'all'`：跳过 host 检查。**并不推荐这样做**，因为不检查 host 的应用程序容易受到 DNS 重绑定攻击。

* `[string]`：数组白名单

  ```js
  module.exports = {
    //...
    devServer: {
      allowedHosts: [
        'host.com',
        'subdomain.host.com',
        'subdomain2.host.com',
        'host2.com',
      ],
    },
  };
  ```

::: warning 为什么要 host 检查？

进行 `host` 请求头部字段检查(或检查 `origin` 头部字段)，防止其他的应用程序进行访问。

例如只允许 `localhost`、`devServer.host` 的网站进行访问 devServer 服务器

:::

### 原理

* 检查机制：检查机制很简单，就是提取出请求报文的头部字段(`host` 或者 `origin`)与配置的白名单进行比较

  ```js
  checkHeader(headers /** 请求头字段集合 */, headerToCheck /** 需要检查的请求头字段 */) {
    // 设置为 'all'，全部通过
    if (this.options.allowedHosts === "all") {
      return true;
    }
    
  	// 对于没有检查头部字段的请求，直接 false
    const hostHeader = headers[headerToCheck];
    if (!hostHeader) {
      return false;
    }
    
    // 对于 file: 协议或 extension(?) 协议，直接 true
    if (/^(file|.+-extension):/i.test(hostHeader)) {
      return true;
    }
    
    // 对于使用本机 IPV4 或 IPV6 或 localhost 或 devServer.host 指定的，直接 true
    const isValidHostname =
      (hostname !== null && ipaddr.IPv4.isValid(hostname)) ||
      (hostname !== null && ipaddr.IPv6.isValid(hostname)) ||
      hostname === "localhost" ||
      hostname === this.options.host;
    if (isValidHostname) {
      return true;
    }
    
    /** 对 devServer.allowedHosts 设置白名单进行匹配，匹配通过 */
    
    
    // 其他检查不通过
    return false;
  }
  ```

* 检查的地方：因为 devServer 会开启 http(https、http2) 服务器和 ws 服务器，所以会在两个地方进行检查

  * http(https、http2) 服务器：注册一个 express 中间件，并且会在请求开始先执行

    ```js
    setupHostHeaderCheck() {
      // all('*', function)：匹配所有的路由，所有的请求都会经过这个方法
      (this.app).all(
        "*",
        (req, res, next) => {
          // 检测 host 请求头字段是否在白名单中
          if (this.checkHeader(req.headers, "host" )) {
            return next(); // 检查通过，放行至下一个中间件
          }
          res.send("Invalid Host header"); // 直接返回消息：无效的主机头
        }
      );
    }
    ```

  * ws 服务器：在与客户端建立建立(connection)事件中，进行 `host`、`origin` 头部字段检查

    ```js
    (this.webSocketServer).implementation.on(
    	'connection', // 与客户端建立连接
      (client, request) => {
        // 提取出请求头
     		const headers =
              typeof request !== "undefined"
                ? request.headers
                : typeof (client).headers !== "undefined"
                ? (client).headers
                : undefined;  
        
        // 请求头无效 -- 验证 host、origin 请求头
        if (
          !headers ||
          !this.checkHeader(headers, "host") ||
          !this.checkHeader(headers, "origin")
        ) {
          this.sendMessage([client], "error", "Invalid Host/Origin header");
          
          // 关闭 ws 连接
          client.close();
          return;
        }
        
      }
    )
    ```

## devServer.open - 打开浏览器

* `boolean = false` `string` `object` `[string, object]`

在服务器启动后打开浏览器，使用默认浏览器进行打开：

```js
module.exports = {
  devServer: {
    open: true, // 使用默认浏览器打开
    open: ['/my-page'], // 打开指定 URL
    open: ['/my-page', '/another-page'], // 打开多个 URL - 会开启多个标签页
    // 对象形式 - 接收所有 open(https://www.npmjs.com/package/open) 配置项
    open: {
      target: ['first.html', 'http://localhost:8080/second.html'],
      app: {
        name: 'google-chrome',
        arguments: ['--incognito', '--new-window'],
      },
    }
  },
};
```

### 原理

内部使用 [open](https://www.npmjs.com/package/open) 库实现。

1. 在初始时，会将 `devServer.open` 规范化为数组形式，数据签名如下：

   ```tsx
   interface NormalizedOpen {
     target: string, // 打开目标 URL
     options: import("open").Options, // open 库的配置项
   }
   ```

2. 在服务开启后，会执行如下逻辑：

   ```js
   // 如果 devServer.open 存在值，说明需要在服务开启后打开浏览器
   if ((this.options.open).length > 0) {
     // 打开的 URL：http://localhost:8082/
     const openTarget = prettyPrintURL(this.options.host || "localhost");
     
     this.openBrowser(openTarget);
   }
   
   // 遍历 devServer.open，拼接一个完成 URL，借助 open 库实现功能
   function openBrowser(defaultOpenTarget) {
     const open = require("open");
     Promise.all(
       (this.options.open).map((item) => {
         let openTarget; // 打开目标，拼接了路径 - http://localhost:8082/my-page
         if (item.target === "<url>") {
           openTarget = defaultOpenTarget;
         } else {
           openTarget = Server.isAbsoluteURL(item.target)
             ? item.target
             : new URL(item.target, defaultOpenTarget).toString();
         }
         // 直接启用 open 库打开即可
         return open(openTarget, item.options).catch(() => {
           // 错误处理，warning 一下
       	})
     );
   }
   ```

## devServer.hot - 热替换

* `'only'` `boolean = true`

启用 webpack 的 [热模块替换](https://webpack.docschina.org/concepts/hot-module-replacement/) 特性：

* `hot: 'only'`：启用热模块替换功能，在构建失败时不刷新页面作为回退
* `boolean = true`：默认为 true，默认会开启热更新功能

```js
module.exports = {
  devServer: {
    hot: true,
    hot: 'only',
  },
};

```

::: tip 注意

从 webpack-dev-server v4 开始，HMR 是默认启用的。它会自动应用[`webpack.HotModuleReplacementPlugin`](https://webpack.docschina.org/plugins/hot-module-replacement-plugin/)，这是启用 HMR 所必需的。

:::

### 原理

1. 对于服务端，向 `webpack.Compiler` 注入一个 `webpack.HotModuleReplacementPlugin` 插件

   ```js
   // 只有在客户端和服务器需要进行 Socket 通信的时候才会进行 HMR
   if (this.options.webSocketServer) {
     // 多编译器情况下
     const compilers = (this.compiler).compilers || [this.compiler];
     compilers.forEach((compiler) => {
       // 需要开启 HMR 时才会
       if (this.options.hot) {
         // 检测用户是否注册了 webpack.HotModuleReplacementPlugin 插件
         const HMRPluginExists = compiler.options.plugins.find(
           (p) => p.constructor === webpack.HotModuleReplacementPlugin
         );
         if (HMRPluginExists) {
           // ...
         } else {
           // 添加 webpack.HotModuleReplacementPlugin 插件实现 HMR
           const plugin = new webpack.HotModuleReplacementPlugin();
           plugin.apply(compiler);
         }
       }
     })
   }
   ```

2. 对于客户端：添加 `hot` 相应入口，在服务端通知变更时进行操作：

   ```js
   if (this.options.webSocketServer) {
       // 多编译器情况下
       const compilers = (this.compiler).compilers || [this.compiler];
       compilers.forEach((compiler) => {
         this.addAdditionalEntries(compiler); // 为每个 Compiler 添加一个客户端入口
       })
   }
   
   function addAdditionalEntries(compiler) {
     const additionalEntries = []; // 需要添加的 entry 列表
     
     // 对于客户端，需要添加对应 hot 入口
     if (this.options.hot === "only") {
       additionalEntries.push(require.resolve("webpack/hot/only-dev-server"));
     } else if (this.options.hot) {
       additionalEntries.push(require.resolve("webpack/hot/dev-server"));
     }
     
     for (const additionalEntry of additionalEntries) {
       // 借助 EntryPlugin 插件添加入口，这样上面的添加的 entry 就会注入到 chunk 中
       new webpack.EntryPlugin(compiler.context, additionalEntry, {
         name: undefined, // name 为 undefined 应该就可以让这几个 entry 在主入口的 chunk 中
       }).apply(compiler);
     }
   }
   ```

3. 具体的 `HMR` 功能原理参考，待续

## 整体流程

整理的比较糟糕，还是直接看[源码解析文件](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack%405.68.0/webpack%20%E4%BE%9D%E8%B5%96%E5%8C%85/webpack-dev-server/lib/Server.js)吧

::: warning 简单整理一下流程

* 在 `webpack-cli` 中生成 `webpack-dev-server` 类并将控制权交由 `webpack-dev-server`

* **开启本地服务器(http、https、http2)**：`Server` 内部会通过 `express` 开启一个本地服务器，并通过 [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) 来代理构建的文件。以及会生成各种中间件实现其他功能
  * `webpack-dev-middleware`：会调用 `webapck.watch()` 方法来实现 `webpack` 的构建(类似于 `watch` 模式)，并生一个 `express` 中间件代理构建资源。
  
* **开启本地 ws 服务器**：`Server` 内部还会生成一个 `ws` 服务器，同时会向客户端注入入口(向 `Webpack.Compiler` 注入一个 entry)，在客户端连接这个本地 `ws` 服务器。**客户端和服务器就可以实现双向通信**，如果监听到文件变化资源重新构建时可以通知客户端做出相应的处理

:::

1. 在 `webpack-cli` 中会判断是 `server` 模式，就会调用生成一个 `DevServer` 类，接着调用 `DevServer.start()` 将控制权交给 `webpak-dev-server`

   ```js
   if (isDevServer4) {
     	// webpack-dev-server v4 版本，生成一个 DevServer 类，在 DevServer 构造器中主要初始化一下属性
       server = new DevServer(devServerOptions, compiler); 
   } else {
       // webpack-dev-server v3 版本
   }
   if (typeof server.start === "function") {
     	// 调用 start() 方法开启服务
       await server.start();
   }
   ```

2. `Server.start()`：启动服务的相关逻辑都在这个方法中

   ```js
   async start() {
     // 1. 规范化配置项
     await this.normalizeOptions();
     
     // 2. 提取出 host 和 port
     if (this.options.ipc) { /** 略过 */ } else {
       this.options.host = await Server.getHostname(this.options.host);
     	this.options.port = await Server.getFreePort(this.options.host);
     }
     
     // 3. 初始化本地服务器相关，见下文 - 简单理解就是生成 express 实例，设置各种中间件
     await this.initialize();
     
     // 4. 启动监听连接的服务器 - this.server.listen()
     const listenOptions = this.options.ipc
       ? { path: this.options.ipc }
       : { host: this.options.host, port: this.options.port };
     await new Promise((resolve) => {
         (this.server).listen(listenOptions, () => {
           resolve();
         });
     })
     
     // 5. 创建本地 ws 服务器，并在与客户端连接时发送一些数据给客户端 - 也可能是其他类型服务器
     if (this.options.webSocketServer) {
       this.createWebSocketServer();
     }
     
     // 6. devServer.bonjour：这个配置用于在启动时通过 ZeroConf 网络广播你的开发服务器。
     if (this.options.bonjour) {
       this.runBonjour();
     }
     
     // 7. 进行终端信息输出
     this.logStatus();
     
     // devServer.onListening：提供在 webpack-dev-server 开始监听端口连接时执行自定义函数的能力。
     if (typeof this.options.onListening === "function") {
       this.options.onListening(this);
     }
   }
   ```































