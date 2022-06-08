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

## 代理 - devServer.proxy

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

    









