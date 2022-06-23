"use strict";
/**
 * 客户端和服务端会通过 ws 服务器传递如下消息, 客户端接收到消息后，会采用不同的策略，具体策略可见：../client/index.js 文件
 * 这里重点看一下编译完成后，发送的 ok 消息：{ "type": "ok" }
 *  客户端接收到这条消息后，会重新加载应用或者 hot 模块热替换：
 *      1. 如果不支持 hot 的话，策略如下：  
 *          只要支持 liveReload 功能(默认支持)，那么就会调用 location.reload() 方法刷新页面
 *      2. 如果支持 hot 的话，策略如下：
 *          通过 hotEmitter 发送 webpackHotUpdate 事件，并传递编译 hash 参数，此时就会交给 webapck/hot/dev-server.js 进行处理进行 hot，
 *          接下来的逻辑查看 webapck/HotModuleReplacementPlugin.js 插件文件
 */
/**
 * 当初次构建时，会发送如下消息：
 *  1. 在创建本地 ws 服务器的 createWebSocketServer 方法中，会初始发送一些消息，表明需要的功能
 *      如果设置了功能 options.hot：发送 {"type": "hot"}
 *      如果设置了功能 options.liveReload：发送 {"type": "liveReload"}
 *      如果设置了功能 options.client.progress：发送 {"type": "progress", "data": xxx}
 *      如果设置了功能 options.client.reconnect：发送 {"type": "reconnect", "data": 重连次数}
 *      如果设置了功能 options.client.overlay：发送 {"type": "overlay", "data": overlay设置值}
 *  2. 在初次编译完成后，会通过 sendStats 方法传递消息：
 *      当次编译的 hash 值：{"type":"hash","data":"8954544ba0c760cc1f4a"}
 *      如果编译出现错误或警告，那么就将错误和警告信息发送给客户端
 *         1. 错误：{"type": "errors", "data": [{ loc: 错误位置(行:列), message: 错误信息, moduleName: 错误文件 }]}
 *         2. 警告：{ "type": "warnings", "data": 与错误类似 }
 *      如果没有错误或警告，发送一条 ok 消息
 *         { "type": "ok" }
 */

/**
 * 当文件发生变动，客户端和本地服务端的消息往返
 *  首先会在 compiler.hooks.invalid(文件开始哈发送变化) 事件中，发送一条消息
 *    {"type":"invalid"}
 *  然后会在编译结束后，在 compiler.hooks.done(编译结束) 事件中，根据构建信息发送消息
 *    与初次编译完成一样，通过 sendStats 方法传递消息，如上
 */


const os = require("os");
const path = require("path");
const url = require("url");
const util = require("util");
const fs = require("graceful-fs");
const ipaddr = require("ipaddr.js");
const defaultGateway = require("default-gateway");
const express = require("express");
const { validate } = require("schema-utils");
const schema = require("./options.json");

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").MultiCompiler} MultiCompiler */
/** @typedef {import("webpack").Configuration} WebpackConfiguration */
/** @typedef {import("webpack").StatsOptions} StatsOptions */
/** @typedef {import("webpack").StatsCompilation} StatsCompilation */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").MultiStats} MultiStats */
/** @typedef {import("os").NetworkInterfaceInfo} NetworkInterfaceInfo */
/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */
/** @typedef {import("express").NextFunction} NextFunction */
/** @typedef {import("express").RequestHandler} ExpressRequestHandler */
/** @typedef {import("express").ErrorRequestHandler} ExpressErrorRequestHandler */
/** @typedef {import("chokidar").WatchOptions} WatchOptions */
/** @typedef {import("chokidar").FSWatcher} FSWatcher */
/** @typedef {import("connect-history-api-fallback").Options} ConnectHistoryApiFallbackOptions */
/** @typedef {import("bonjour-service").Bonjour} Bonjour */
/** @typedef {import("bonjour-service").Service} BonjourOptions */
/** @typedef {import("http-proxy-middleware").RequestHandler} RequestHandler */
/** @typedef {import("http-proxy-middleware").Options} HttpProxyMiddlewareOptions */
/** @typedef {import("http-proxy-middleware").Filter} HttpProxyMiddlewareOptionsFilter */
/** @typedef {import("serve-index").Options} ServeIndexOptions */
/** @typedef {import("serve-static").ServeStaticOptions} ServeStaticOptions */
/** @typedef {import("ipaddr.js").IPv4} IPv4 */
/** @typedef {import("ipaddr.js").IPv6} IPv6 */
/** @typedef {import("net").Socket} Socket */
/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("open").Options} OpenOptions */

/** @typedef {import("https").ServerOptions & { spdy?: { plain?: boolean | undefined, ssl?: boolean | undefined, 'x-forwarded-for'?: string | undefined, protocol?: string | undefined, protocols?: string[] | undefined }}} ServerOptions */

/**
 * @template Request, Response
 * @typedef {import("webpack-dev-middleware").Options<Request, Response>} DevMiddlewareOptions
 */

/**
 * @template Request, Response
 * @typedef {import("webpack-dev-middleware").Context<Request, Response>} DevMiddlewareContext
 */

/**
 * @typedef {"local-ip" | "local-ipv4" | "local-ipv6" | string} Host
 */

/**
 * @typedef {number | string | "auto"} Port
 */

/**
 * @typedef {Object} WatchFiles
 * @property {string | string[]} paths
 * @property {WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} [options]
 */

/**
 * @typedef {Object} Static
 * @property {string} [directory]
 * @property {string | string[]} [publicPath]
 * @property {boolean | ServeIndexOptions} [serveIndex]
 * @property {ServeStaticOptions} [staticOptions]
 * @property {boolean | WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} [watch]
 */

/**
 * @typedef {Object} NormalizedStatic
 * @property {string} directory
 * @property {string[]} publicPath
 * @property {false | ServeIndexOptions} serveIndex
 * @property {ServeStaticOptions} staticOptions
 * @property {false | WatchOptions} watch
 */

/**
 * @typedef {Object} ServerConfiguration
 * @property {"http" | "https" | "spdy" | string} [type]
 * @property {ServerOptions} [options]
 */

/**
 * @typedef {Object} WebSocketServerConfiguration
 * @property {"sockjs" | "ws" | string | Function} [type]
 * @property {Record<string, any>} [options]
 */

/**
 * @typedef {(import("ws").WebSocket | import("sockjs").Connection & { send: import("ws").WebSocket["send"], terminate: import("ws").WebSocket["terminate"], ping: import("ws").WebSocket["ping"] }) & { isAlive?: boolean }} ClientConnection
 */

/**
 * @typedef {import("ws").WebSocketServer | import("sockjs").Server & { close: import("ws").WebSocketServer["close"] }} WebSocketServer
 */

/**
 * @typedef {{ implementation: WebSocketServer, clients: ClientConnection[] }} WebSocketServerImplementation
 */

/**
 * @callback ByPass
 * @param {Request} req
 * @param {Response} res
 * @param {ProxyConfigArrayItem} proxyConfig
 */

/**
 * @typedef {{ path?: HttpProxyMiddlewareOptionsFilter | undefined, context?: HttpProxyMiddlewareOptionsFilter | undefined } & { bypass?: ByPass } & HttpProxyMiddlewareOptions } ProxyConfigArrayItem
 */

/**
 * @typedef {(ProxyConfigArrayItem | ((req?: Request | undefined, res?: Response | undefined, next?: NextFunction | undefined) => ProxyConfigArrayItem))[]} ProxyConfigArray
 */

/**
 * @typedef {{ [url: string]: string | ProxyConfigArrayItem }} ProxyConfigMap
 */

/**
 * @typedef {Object} OpenApp
 * @property {string} [name]
 * @property {string[]} [arguments]
 */

/**
 * @typedef {Object} Open
 * @property {string | string[] | OpenApp} [app]
 * @property {string | string[]} [target]
 */

/**
 * @typedef {Object} NormalizedOpen
 * @property {string} target
 * @property {import("open").Options} options
 */

/**
 * @typedef {Object} WebSocketURL
 * @property {string} [hostname]
 * @property {string} [password]
 * @property {string} [pathname]
 * @property {number | string} [port]
 * @property {string} [protocol]
 * @property {string} [username]
 */

/**
 * @typedef {Object} ClientConfiguration
 * @property {"log" | "info" | "warn" | "error" | "none" | "verbose"} [logging]
 * @property {boolean  | { warnings?: boolean, errors?: boolean }} [overlay]
 * @property {boolean} [progress]
 * @property {boolean | number} [reconnect]
 * @property {"ws" | "sockjs" | string} [webSocketTransport]
 * @property {string | WebSocketURL} [webSocketURL]
 */

/**
 * @typedef {Array<{ key: string; value: string }> | Record<string, string | string[]>} Headers
 */

/**
 * @typedef {{ name?: string, path?: string, middleware: ExpressRequestHandler | ExpressErrorRequestHandler } | ExpressRequestHandler | ExpressErrorRequestHandler} Middleware
 */

/**
 * @typedef {Object} Configuration
 * @property {boolean | string} [ipc]
 * @property {Host} [host]
 * @property {Port} [port]
 * @property {boolean | "only"} [hot]
 * @property {boolean} [liveReload]
 * @property {DevMiddlewareOptions<Request, Response>} [devMiddleware]
 * @property {boolean} [compress]
 * @property {boolean} [magicHtml]
 * @property {"auto" | "all" | string | string[]} [allowedHosts]
 * @property {boolean | ConnectHistoryApiFallbackOptions} [historyApiFallback]
 * @property {boolean} [setupExitSignals]
 * @property {boolean | Record<string, never> | BonjourOptions} [bonjour]
 * @property {string | string[] | WatchFiles | Array<string | WatchFiles>} [watchFiles]
 * @property {boolean | string | Static | Array<string | Static>} [static]
 * @property {boolean | ServerOptions} [https]
 * @property {boolean} [http2]
 * @property {"http" | "https" | "spdy" | string | ServerConfiguration} [server]
 * @property {boolean | "sockjs" | "ws" | string | WebSocketServerConfiguration} [webSocketServer]
 * @property {ProxyConfigMap | ProxyConfigArrayItem | ProxyConfigArray} [proxy]
 * @property {boolean | string | Open | Array<string | Open>} [open]
 * @property {boolean} [setupExitSignals]
 * @property {boolean | ClientConfiguration} [client]
 * @property {Headers | ((req: Request, res: Response, context: DevMiddlewareContext<Request, Response>) => Headers)} [headers]
 * @property {(devServer: Server) => void} [onAfterSetupMiddleware]
 * @property {(devServer: Server) => void} [onBeforeSetupMiddleware]
 * @property {(devServer: Server) => void} [onListening]
 * @property {(middlewares: Middleware[], devServer: Server) => Middleware[]} [setupMiddlewares]
 */

if (!process.env.WEBPACK_SERVE) {
  // TODO fix me in the next major release
  // @ts-ignore
  process.env.WEBPACK_SERVE = true;
}

class Server {
  /**
   * @param {Configuration | Compiler | MultiCompiler} options
   * @param {Compiler | MultiCompiler | Configuration} compiler
   */
  /**
   * 如果 webpack 启动 serve 服务的话，在 webpack-cli 中就会执行 new Server 生成一个 Server 类
   * 并在 webpack-cli 中启动 Server.start 实现 Compiler、Watch、Server、HMR等工作
   * 
   * 这个类的构造函数没有其他工作，主要是初始化一些属性，启动方法还是在 start() 方法中
   */
  constructor(options = {}, compiler) {
    // TODO: remove this after plugin support is published
    if (/** @type {Compiler | MultiCompiler} */ (options).hooks) {
      util.deprecate(
        () => {},
        "Using 'compiler' as the first argument is deprecated. Please use 'options' as the first argument and 'compiler' as the second argument.", // 不赞成使用'compiler'作为第一个参数。请使用'options'作为第一个参数，'compiler'作为第二个参数。
        "DEP_WEBPACK_DEV_SERVER_CONSTRUCTOR"
      )();

      [options = {}, compiler] = [compiler, options];
    }

    // 验证配置项
    validate(/** @type {Schema} */ (schema), options, {
      name: "Dev Server",
      baseDataPath: "options",
    });

    // 编译器
    this.compiler = /** @type {Compiler | MultiCompiler} */ (compiler);
    /**
     * @type {ReturnType<Compiler["getInfrastructureLogger"]>}
     * */
    // 打印类
    this.logger = this.compiler.getInfrastructureLogger("webpack-dev-server");
    this.options = /** @type {Configuration} */ (options); // 配置项
    /**
     * @type {FSWatcher[]}
     */
    this.staticWatchers = []; // 文件监听器集合
    /**
     * @private
     * @type {{ name: string | symbol, listener: (...args: any[]) => void}[] }}
     */
    this.listeners = [];
    // Keep track of websocket proxies for external websocket upgrade. 为外部websocket升级跟踪websocket代理
    /**
     * @private
     * @type {RequestHandler[]}
     */
    this.webSocketProxies = []; // devServer.proxy.ws：需要代理的 ws 服务器，需要涉及到协议升级(ws 协议会先用 http 协议后进行升级)
    /**
     * @type {Socket[]}
     */
    this.sockets = []; // 服务器的 socket 列表 -- 在服务器 stop 的时候，删除所有的 socket
    /**
     * @private
     * @type {string | undefined}
     */
    // eslint-disable-next-line no-undefined
    this.currentHash = undefined;
  }

  // TODO compatibility with webpack v4, remove it after drop
  static get cli() {
    return {
      get getArguments() {
        return () => require("../bin/cli-flags");
      },
      get processArguments() {
        return require("../bin/process-arguments");
      },
    };
  }

  static get schema() {
    return schema;
  }

  /**
   * @private
   * @returns {StatsOptions}
   * @constructor
   */
  static get DEFAULT_STATS() {
    return {
      all: false,
      hash: true,
      warnings: true,
      errors: true,
      errorDetails: false,
    };
  }

  /**
   * @param {string} URL
   * @returns {boolean}
   */
  static isAbsoluteURL(URL) {
    // Don't match Windows paths `c:\`
    if (/^[a-zA-Z]:\\/.test(URL)) {
      return false;
    }

    // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
    // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(URL);
  }

  /**
   * @param {string} gateway
   * @returns {string | undefined}
   */
  static findIp(gateway) {
    const gatewayIp = ipaddr.parse(gateway);

    // Look for the matching interface in all local interfaces.
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const { cidr } of /** @type {NetworkInterfaceInfo[]} */ (
        addresses
      )) {
        const net = ipaddr.parseCIDR(/** @type {string} */ (cidr));

        if (
          net[0] &&
          net[0].kind() === gatewayIp.kind() &&
          gatewayIp.match(net)
        ) {
          return net[0].toString();
        }
      }
    }
  }

  /**
   * 获取本机的 IP 地址
   * @param {"v4" | "v6"} family
   * @returns {Promise<string | undefined>}
   */
  static async internalIP(family) {
    try {
      const { gateway } = await defaultGateway[family]();
      return Server.findIp(gateway);
    } catch {
      // ignore
    }
  }

  /**
   * @param {"v4" | "v6"} family
   * @returns {string | undefined}
   */
  static internalIPSync(family) {
    try {
      const { gateway } = defaultGateway[family].sync();
      return Server.findIp(gateway);
    } catch {
      // ignore
    }
  }

  /**
   * 获取 host -- 详情可见：devServer.host
   * @param {Host} hostname
   * @returns {Promise<string>}
   */
  static async getHostname(hostname) {
    if (hostname === "local-ip") {
      // 将 local-ip 指定为主机将尝试将主机选项解析为您的本地 IPv4 地址（如果可用），如果 IPv4 不可用，它将尝试解析您的本地 IPv6 地址。
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
  }

  /**
   * 获取监听请求的端口号，如果设置为 auto，则自动使用一个可用端口
   * @param {Port} port
   * @param {string} host
   * @returns {Promise<number | string>}
   */
  static async getFreePort(port, host) {
    if (typeof port !== "undefined" && port !== null && port !== "auto") {
      return port;
    }

    const pRetry = require("p-retry");
    const getPort = require("./getPort");
    const basePort =
      typeof process.env.WEBPACK_DEV_SERVER_BASE_PORT !== "undefined"
        ? parseInt(process.env.WEBPACK_DEV_SERVER_BASE_PORT, 10)
        : 8080;

    // Try to find unused port and listen on it for 3 times,
    // if port is not specified in options.
    const defaultPortRetry =
      typeof process.env.WEBPACK_DEV_SERVER_PORT_RETRY !== "undefined"
        ? parseInt(process.env.WEBPACK_DEV_SERVER_PORT_RETRY, 10)
        : 3;

    return pRetry(() => getPort(basePort, host), {
      retries: defaultPortRetry,
    });
  }

  /**
   * @returns {string}
   */
  static findCacheDir() {
    const cwd = process.cwd();

    /**
     * @type {string | undefined}
     */
    let dir = cwd;

    for (;;) {
      try {
        if (fs.statSync(path.join(dir, "package.json")).isFile()) break;
        // eslint-disable-next-line no-empty
      } catch (e) {}

      const parent = path.dirname(dir);

      if (dir === parent) {
        // eslint-disable-next-line no-undefined
        dir = undefined;
        break;
      }

      dir = parent;
    }

    if (!dir) {
      return path.resolve(cwd, ".cache/webpack-dev-server");
    } else if (process.versions.pnp === "1") {
      return path.resolve(dir, ".pnp/.cache/webpack-dev-server");
    } else if (process.versions.pnp === "3") {
      return path.resolve(dir, ".yarn/.cache/webpack-dev-server");
    }

    return path.resolve(dir, "node_modules/.cache/webpack-dev-server");
  }

  /**
   * 给 Compiler 添加 entry，借助 webpack.EntryPlugin 插件即可实现
   *  1. `${require.resolve("../client/index.js")}?${webSocketURLStr}`：注入连接 ws 本地服务器进行通信。
   *      --> 通过 ?${webSocketURLStr} 方式传递 ws 服务器的 URL，在 ../client/index.js 文件中可以通过 __resourceQuery 获取到这个 URL，这样客户端就知道连接到哪个服务器
   *  2. webpack/hot/only-dev-server(或 webpack/hot/dev-server，两者差异在构建失败时不刷新页面作为回退)，用于客户端的热更新
   * @private
   * @param {Compiler} compiler
   */
  addAdditionalEntries(compiler) {
    /**
     * @type {string[]}
     */
    const additionalEntries = []; // 需要添加的 entry 列表

    // 项目构建目标
    const isWebTarget = compiler.options.externalsPresets
      ? compiler.options.externalsPresets.web
      : [
          "web",
          "webworker",
          "electron-preload",
          "electron-renderer",
          "node-webkit",
          // eslint-disable-next-line no-undefined
          undefined,
          null,
        ].includes(/** @type {string} */ (compiler.options.target));

    // TODO maybe empty empty client 可能是空的空客户端
    /**
     * devServer.client：配置客户端相关
     * isWebTarget：构建目标是否为 web 相关，因为只有 web、webworker、electron-renderer 和 node-webkit 等的热加载才有作用
     */
    if (this.options.client && isWebTarget) {
      let webSocketURLStr = "";

      // 根据 devServer.webSocketServer 获取到本地服务器需要启动的 URL，默认为：protocol=ws%3A&hostname=0.0.0.0&port=8080&pathname=%2Fws&logging=info&reconnect=10
      if (this.options.webSocketServer) {
        const webSocketURL =
          /** @type {WebSocketURL} */
          (
            /** @type {ClientConfiguration} */
            (this.options.client).webSocketURL
          );
        const webSocketServer =
          /** @type {{ type: WebSocketServerConfiguration["type"], options: NonNullable<WebSocketServerConfiguration["options"]> }} */
          (this.options.webSocketServer);
        const searchParams = new URLSearchParams();

        /** @type {string} */
        let protocol;

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.protocol !== "undefined") {
          protocol = webSocketURL.protocol;
        } else {
          protocol =
            /** @type {ServerConfiguration} */
            (this.options.server).type === "http" ? "ws:" : "wss:";
        }

        searchParams.set("protocol", protocol);

        if (typeof webSocketURL.username !== "undefined") {
          searchParams.set("username", webSocketURL.username);
        }

        if (typeof webSocketURL.password !== "undefined") {
          searchParams.set("password", webSocketURL.password);
        }

        /** @type {string} */
        let hostname;

        // SockJS is not supported server mode, so `hostname` and `port` can't specified, let's ignore them
        // TODO show warning about this
        const isSockJSType = webSocketServer.type === "sockjs";

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.hostname !== "undefined") {
          hostname = webSocketURL.hostname;
        }
        // Web socket server works on custom `hostname`, only for `ws` because `sock-js` is not support custom `hostname`
        else if (
          typeof webSocketServer.options.host !== "undefined" &&
          !isSockJSType
        ) {
          hostname = webSocketServer.options.host;
        }
        // The `host` option is specified
        else if (typeof this.options.host !== "undefined") {
          hostname = this.options.host;
        }
        // The `port` option is not specified
        else {
          hostname = "0.0.0.0";
        }

        searchParams.set("hostname", hostname);

        /** @type {number | string} */
        let port;

        // We are proxying dev server and need to specify custom `port`
        if (typeof webSocketURL.port !== "undefined") {
          port = webSocketURL.port;
        }
        // Web socket server works on custom `port`, only for `ws` because `sock-js` is not support custom `port`
        else if (
          typeof webSocketServer.options.port !== "undefined" &&
          !isSockJSType
        ) {
          port = webSocketServer.options.port;
        }
        // The `port` option is specified
        else if (typeof this.options.port === "number") {
          port = this.options.port;
        }
        // The `port` option is specified using `string`
        else if (
          typeof this.options.port === "string" &&
          this.options.port !== "auto"
        ) {
          port = Number(this.options.port);
        }
        // The `port` option is not specified or set to `auto`
        else {
          port = "0";
        }

        searchParams.set("port", String(port));

        /** @type {string} */
        let pathname = "";

        // We are proxying dev server and need to specify custom `pathname`
        if (typeof webSocketURL.pathname !== "undefined") {
          pathname = webSocketURL.pathname;
        }
        // Web socket server works on custom `path`
        else if (
          typeof webSocketServer.options.prefix !== "undefined" ||
          typeof webSocketServer.options.path !== "undefined"
        ) {
          pathname =
            webSocketServer.options.prefix || webSocketServer.options.path;
        }

        searchParams.set("pathname", pathname);

        const client = /** @type {ClientConfiguration} */ (this.options.client);

        if (typeof client.logging !== "undefined") {
          searchParams.set("logging", client.logging);
        }

        if (typeof client.reconnect !== "undefined") {
          searchParams.set(
            "reconnect",
            typeof client.reconnect === "number"
              ? String(client.reconnect)
              : "10"
          );
        }

        webSocketURLStr = searchParams.toString();
      }
    
      /**
       * 添加一个入口，并且将 URL 传递，通过 ?${webSocketURLStr} 方式传递
       * 这样的话，在 ../client/index.js 文件中可以通过 __resourceQuery 获取到这个 URL，这样客户端就知道连接到哪个服务器
       */
      additionalEntries.push(
        `${require.resolve("../client/index.js")}?${webSocketURLStr}`
      );
    }

    // devServer.hot：启用 webpack 的 热模块替换 特性
    // 对于客户端，需要添加对应 hot 入口
    if (this.options.hot === "only") {
      additionalEntries.push(require.resolve("webpack/hot/only-dev-server"));
    } else if (this.options.hot) {
      additionalEntries.push(require.resolve("webpack/hot/dev-server"));
    }

    const webpack = compiler.webpack || require("webpack");

    // use a hook to add entries if available 使用钩子添加可用的条目
    if (typeof webpack.EntryPlugin !== "undefined") {
      for (const additionalEntry of additionalEntries) {
        // 借助 EntryPlugin 插件添加入口，这样上面的添加的 entry 就会注入到 chunk 中
        new webpack.EntryPlugin(compiler.context, additionalEntry, {
          // eslint-disable-next-line no-undefined
          name: undefined, // name 为 undefined 应该就可以让这几个 entry 在主入口的 chunk 中
        }).apply(compiler);
      }
    }
    // TODO remove after drop webpack v4 support 删除 webpack v4 支持
    else {
      /**
       * prependEntry Method for webpack 4
       * @param {any} originalEntry
       * @param {any} newAdditionalEntries
       * @returns {any}
       */
      const prependEntry = (originalEntry, newAdditionalEntries) => {
        if (typeof originalEntry === "function") {
          return () =>
            Promise.resolve(originalEntry()).then((entry) =>
              prependEntry(entry, newAdditionalEntries)
            );
        }

        if (
          typeof originalEntry === "object" &&
          !Array.isArray(originalEntry)
        ) {
          /** @type {Object<string,string>} */
          const clone = {};

          Object.keys(originalEntry).forEach((key) => {
            // entry[key] should be a string here
            const entryDescription = originalEntry[key];

            clone[key] = prependEntry(entryDescription, newAdditionalEntries);
          });

          return clone;
        }

        // in this case, entry is a string or an array.
        // make sure that we do not add duplicates.
        /** @type {any} */
        const entriesClone = additionalEntries.slice(0);

        [].concat(originalEntry).forEach((newEntry) => {
          if (!entriesClone.includes(newEntry)) {
            entriesClone.push(newEntry);
          }
        });

        return entriesClone;
      };

      compiler.options.entry = prependEntry(
        compiler.options.entry || "./src",
        additionalEntries
      );
      compiler.hooks.entryOption.call(
        /** @type {string} */ (compiler.options.context),
        compiler.options.entry
      );
    }
  }

  /**
   * @private
   * @returns {Compiler["options"]}
   */
  // 提取 COmpiler 配置项
  getCompilerOptions() {
    // 如果是多编译器情况下，提取 COmpiler 配置项情况稍微复杂些
    if (
      typeof (/** @type {MultiCompiler} */ (this.compiler).compilers) !==
      "undefined"
    ) {
      if (/** @type {MultiCompiler} */ (this.compiler).compilers.length === 1) {
        return (
          /** @type {MultiCompiler} */
          (this.compiler).compilers[0].options
        );
      }

      // Configuration with the `devServer` options
      const compilerWithDevServer =
        /** @type {MultiCompiler} */
        (this.compiler).compilers.find((config) => config.options.devServer);

      if (compilerWithDevServer) {
        return compilerWithDevServer.options;
      }

      // Configuration with `web` preset
      const compilerWithWebPreset =
        /** @type {MultiCompiler} */
        (this.compiler).compilers.find(
          (config) =>
            (config.options.externalsPresets &&
              config.options.externalsPresets.web) ||
            [
              "web",
              "webworker",
              "electron-preload",
              "electron-renderer",
              "node-webkit",
              // eslint-disable-next-line no-undefined
              undefined,
              null,
            ].includes(/** @type {string} */ (config.options.target))
        );

      if (compilerWithWebPreset) {
        return compilerWithWebPreset.options;
      }

      // Fallback
      return /** @type {MultiCompiler} */ (this.compiler).compilers[0].options;
    }

    // 单个 Compiler 情况下，直接提取出 Compiler.options 即可
    return /** @type {Compiler} */ (this.compiler).options;
  }

  /**
   * 规范化 devServer.options 配置项
   * @private
   * @returns {Promise<void>}
   */
  async normalizeOptions() {
    const { options } = this; // 提取配置项
    const compilerOptions = this.getCompilerOptions(); // 提取出 Compiler 配置项
    // TODO remove `{}` after drop webpack v4 support 删除 webpack v4支持后的' {}'
    const compilerWatchOptions = compilerOptions.watchOptions || {}; // webpack.watch 配置项
    /**
     * @param {WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} watchOptions
     * @returns {WatchOptions}
     */
    const getWatchOptions = (watchOptions = {}) => {
      const getPolling = () => {
        if (typeof watchOptions.usePolling !== "undefined") {
          return watchOptions.usePolling;
        }

        if (typeof watchOptions.poll !== "undefined") {
          return Boolean(watchOptions.poll);
        }

        if (typeof compilerWatchOptions.poll !== "undefined") {
          return Boolean(compilerWatchOptions.poll);
        }

        return false;
      };
      const getInterval = () => {
        if (typeof watchOptions.interval !== "undefined") {
          return watchOptions.interval;
        }

        if (typeof watchOptions.poll === "number") {
          return watchOptions.poll;
        }

        if (typeof compilerWatchOptions.poll === "number") {
          return compilerWatchOptions.poll;
        }
      };

      const usePolling = getPolling();
      const interval = getInterval();
      const { poll, ...rest } = watchOptions;

      return {
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        atomic: false,
        alwaysStat: true,
        ignorePermissionErrors: true,
        // Respect options from compiler watchOptions 从编译器查看选项的选项
        usePolling,
        interval,
        ignored: watchOptions.ignored,
        // TODO: we respect these options for all watch options and allow developers to pass them to chokidar, but chokidar doesn't have these options maybe we need revisit that in future 我们尊重所有的手表选项，并允许开发者将它们传递给chokidar，但chokidar没有这些选项，也许我们需要在未来重新考虑
        ...rest,
      };
    };
    /**
     * 获取 devServer.static 配置项数组项的值
     * @param {string | Static | undefined} [optionsForStatic]
     * @returns {NormalizedStatic}
     */
    const getStaticItem = (optionsForStatic) => {
      const getDefaultStaticOptions = () => {
        return {
          directory: path.join(process.cwd(), "public"),
          staticOptions: {},
          publicPath: ["/"],
          serveIndex: { icons: true },
          watch: getWatchOptions(),
        };
      };

      /** @type {NormalizedStatic} */
      let item;

      if (typeof optionsForStatic === "undefined" /** 如果参数为空，则取默认值 */) {
        item = getDefaultStaticOptions();
      } else if (typeof optionsForStatic === "string" /** 如果参数为 stirng，则配置为这个 string 为目录 */) {
        item = {
          ...getDefaultStaticOptions(),
          directory: optionsForStatic,
        };
      } else {
        // 其他情况
        const def = getDefaultStaticOptions();

        item = {
          directory:
            typeof optionsForStatic.directory !== "undefined"
              ? optionsForStatic.directory
              : def.directory,
          // TODO: do merge in the next major release
          staticOptions:
            typeof optionsForStatic.staticOptions !== "undefined"
              ? optionsForStatic.staticOptions
              : def.staticOptions,
          publicPath:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.publicPath !== "undefined"
              ? Array.isArray(optionsForStatic.publicPath)
                ? optionsForStatic.publicPath
                : [optionsForStatic.publicPath]
              : def.publicPath,
          // TODO: do merge in the next major release
          serveIndex:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.serveIndex !== "undefined"
              ? typeof optionsForStatic.serveIndex === "boolean" &&
                optionsForStatic.serveIndex
                ? def.serveIndex
                : optionsForStatic.serveIndex
              : def.serveIndex,
          watch:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.watch !== "undefined"
              ? // eslint-disable-next-line no-nested-ternary
                typeof optionsForStatic.watch === "boolean"
                ? optionsForStatic.watch
                  ? def.watch
                  : false
                : getWatchOptions(optionsForStatic.watch)
              : def.watch,
        };
      }

      if (Server.isAbsoluteURL(item.directory)) {
        throw new Error("Using a URL as static.directory is not supported");
      }

      return item;
    };

    /**
     * devServer.allowedHosts：该选项允许将允许访问开发服务器的服务列入白名单。
     * 这下面的逻辑用于规范化 options.allowedHosts 配置项
     */
    if (typeof options.allowedHosts === "undefined") {
      // AllowedHosts allows some default hosts picked from `options.host` or `webSocketURL.hostname` and `localhost` 允许的主机允许从选项中选择一些默认主机。host或web SocketURL。主机名”和“localhost”
      options.allowedHosts = "auto"; 
    } else if (
      typeof options.allowedHosts === "string" &&
      options.allowedHosts !== "auto" &&
      options.allowedHosts !== "all"
    ) {
      // We store allowedHosts as array when supplied as string 当提供字符串时，我们将allowed Hosts存储为数组
      options.allowedHosts = [options.allowedHosts];
    } else if (
      // CLI pass options as array, we should normalize them CLI将选项作为数组传递，我们应该规范化它们
      Array.isArray(options.allowedHosts) &&
      options.allowedHosts.includes("all")
    ) {
      options.allowedHosts = "all";
    }

    /**
     * options.bonjour：这个配置用于在启动时通过 ZeroConf 网络广播你的开发服务器，用于服务发现。
     */
    if (typeof options.bonjour === "undefined") {
      options.bonjour = false;
    } else if (typeof options.bonjour === "boolean") {
      options.bonjour = options.bonjour ? {} : false;
    }
    /** 
     * options.client：客户端相关配置
     */
    if (
      typeof options.client === "undefined" ||
      (typeof options.client === "object" && options.client !== null)
    ) {
      // 如果没有配置 options.client 的话，默认为 {}
      if (!options.client) {
        options.client = {};
      }
      /**
       * options.client.webSocketURL：这个选项允许指定 URL 到 web socket 服务器（当你代理开发服务器和客户端脚本不总是知道连接到哪里时很有用）
       */
      if (typeof options.client.webSocketURL === "undefined") {
        options.client.webSocketURL = {};
      } else if (typeof options.client.webSocketURL === "string") {
        const parsedURL = new URL(options.client.webSocketURL);

        options.client.webSocketURL = {
          protocol: parsedURL.protocol,
          hostname: parsedURL.hostname,
          port: parsedURL.port.length > 0 ? Number(parsedURL.port) : "",
          pathname: parsedURL.pathname,
          username: parsedURL.username,
          password: parsedURL.password,
        };
      } else if (typeof options.client.webSocketURL.port === "string") {
        options.client.webSocketURL.port = Number(
          options.client.webSocketURL.port
        );
      }

      /**
       * options.client.overlay：当出现编译错误或警告时，在浏览器中显示全屏覆盖。
       */
      // Enable client overlay by default 默认启用客户端覆盖
      if (typeof options.client.overlay === "undefined") {
        options.client.overlay = true;
      } else if (typeof options.client.overlay !== "boolean") {
        options.client.overlay = {
          errors: true,
          warnings: true,
          ...options.client.overlay,
        };
      }

      /**
       * options.client.reconnect：告诉 dev-server 它应该尝试重新连接客户端的次数。当为 true 时，它将无限次尝试重新连接。
       */
      if (typeof options.client.reconnect === "undefined") {
        options.client.reconnect = 10;
      } else if (options.client.reconnect === true) {
        options.client.reconnect = Infinity;
      } else if (options.client.reconnect === false) {
        options.client.reconnect = 0;
      }

      /**
       * 允许在浏览器中设置日志级别
       */
      // Respect infrastructureLogging.level 尊重 infrastructureLogging.level
      if (typeof options.client.logging === "undefined") {
        options.client.logging = compilerOptions.infrastructureLogging
          ? compilerOptions.infrastructureLogging.level
          : "info";
      }
    }

    /**
     * 是否启用 gzip 压缩
     */
    if (typeof options.compress === "undefined") {
      options.compress = true;
    }

    /**
     * 为 webpack-dev-middleware 提供处理 webpack 资源的配置项。
     */
    if (typeof options.devMiddleware === "undefined") {
      options.devMiddleware = {};
    }

    // No need to normalize `headers` 不需要规范化“headers”

    /**
     * options.historyApiFallback：使用 HTML5 History API 时，可能必须提供 index.html 页面来代替任何 404 响应。通过将 devServer.historyApiFallback 设置为 true 来启用它
     */
    if (typeof options.historyApiFallback === "undefined") {
      options.historyApiFallback = false;
    } else if (
      typeof options.historyApiFallback === "boolean" &&
      options.historyApiFallback
    ) {
      options.historyApiFallback = {};
    }

    // No need to normalize `host` 不需要规范化 “host”

    /**
     * options.hot：启用 webpack 的 热模块替换 特性：
     */
    options.hot =
      typeof options.hot === "boolean" || options.hot === "only"
        ? options.hot
        : true;

    const isHTTPs = Boolean(options.https);
    const isSPDY = Boolean(options.http2);

    if (isHTTPs) {
      // TODO: remove in the next major release 在下一个主要版本中删除
      util.deprecate(
        () => {},
        "'https' option is deprecated. Please use the 'server' option.", // 不赞成使用“https”选项。请使用“server”选项。
        "DEP_WEBPACK_DEV_SERVER_HTTPS"
      )();
    }

    if (isSPDY) {
      // TODO: remove in the next major release 在下一个主要版本中删除
      util.deprecate(
        () => {},
        "'http2' option is deprecated. Please use the 'server' option.",
        "DEP_WEBPACK_DEV_SERVER_HTTP2"
      )();
    }

    /**
     * options.server：允许设置服务器和配置项（默认为 'http'）。
     * 将 options.https、options.http2 配置项同时会这里使用
     */
    options.server = {
      type:
        // eslint-disable-next-line no-nested-ternary
        typeof options.server === "string"
          ? options.server
          : // eslint-disable-next-line no-nested-ternary
          typeof (options.server || {}).type === "string"
          ? /** @type {ServerConfiguration} */ (options.server).type || "http"
          : // eslint-disable-next-line no-nested-ternary
          isSPDY
          ? "spdy"
          : isHTTPs
          ? "https"
          : "http",
      options: {
        .../** @type {ServerOptions} */ (options.https),
        .../** @type {ServerConfiguration} */ (options.server || {}).options,
      },
    };

    if (
      options.server.type === "spdy" &&
      typeof (/** @type {ServerOptions} */ (options.server.options).spdy) ===
        "undefined"
    ) {
      /** @type {ServerOptions} */
      (options.server.options).spdy = {
        protocols: ["h2", "http/1.1"],
      };
    }

    if (options.server.type === "https" || options.server.type === "spdy") {
      if (
        typeof (
          /** @type {ServerOptions} */ (options.server.options).requestCert
        ) === "undefined"
      ) {
        /** @type {ServerOptions} */
        (options.server.options).requestCert = false;
      }

      const httpsProperties =
        /** @type {Array<keyof ServerOptions>} */
        (["cacert", "ca", "cert", "crl", "key", "pfx"]);

      for (const property of httpsProperties) {
        if (
          typeof (
            /** @type {ServerOptions} */ (options.server.options)[property]
          ) === "undefined"
        ) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // @ts-ignore
        if (property === "cacert") {
          // TODO remove the `cacert` option in favor `ca` in the next major release
          util.deprecate(
            () => {},
            "The 'cacert' option is deprecated. Please use the 'ca' option.",
            "DEP_WEBPACK_DEV_SERVER_CACERT"
          )();
        }

        /** @type {any} */
        const value =
          /** @type {ServerOptions} */
          (options.server.options)[property];
        /**
         * @param {string | Buffer | undefined} item
         * @returns {string | Buffer | undefined}
         */
        const readFile = (item) => {
          if (
            Buffer.isBuffer(item) ||
            (typeof item === "object" && item !== null && !Array.isArray(item))
          ) {
            return item;
          }

          if (item) {
            let stats = null;

            try {
              stats = fs.lstatSync(fs.realpathSync(item)).isFile();
            } catch (error) {
              // Ignore error
            }

            // It is file
            return stats ? fs.readFileSync(item) : item;
          }
        };

        /** @type {any} */
        (options.server.options)[property] = Array.isArray(value)
          ? value.map((item) => readFile(item))
          : readFile(value);
      }

      let fakeCert;

      if (
        !(/** @type {ServerOptions} */ (options.server.options).key) ||
        /** @type {ServerOptions} */ (!options.server.options).cert
      ) {
        const certificateDir = Server.findCacheDir();
        const certificatePath = path.join(certificateDir, "server.pem");
        let certificateExists;

        try {
          const certificate = await fs.promises.stat(certificatePath);
          certificateExists = certificate.isFile();
        } catch {
          certificateExists = false;
        }

        if (certificateExists) {
          const certificateTtl = 1000 * 60 * 60 * 24;
          const certificateStat = await fs.promises.stat(certificatePath);
          const now = Number(new Date());

          // cert is more than 30 days old, kill it with fire
          if ((now - Number(certificateStat.ctime)) / certificateTtl > 30) {
            const { promisify } = require("util");
            const rimraf = require("rimraf");
            const del = promisify(rimraf);

            this.logger.info(
              "SSL certificate is more than 30 days old. Removing..."
            );

            await del(certificatePath);

            certificateExists = false;
          }
        }

        if (!certificateExists) {
          this.logger.info("Generating SSL certificate...");

          // @ts-ignore
          const selfsigned = require("selfsigned");
          const attributes = [{ name: "commonName", value: "localhost" }];
          const pems = selfsigned.generate(attributes, {
            algorithm: "sha256",
            days: 30,
            keySize: 2048,
            extensions: [
              {
                name: "basicConstraints",
                cA: true,
              },
              {
                name: "keyUsage",
                keyCertSign: true,
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
                dataEncipherment: true,
              },
              {
                name: "extKeyUsage",
                serverAuth: true,
                clientAuth: true,
                codeSigning: true,
                timeStamping: true,
              },
              {
                name: "subjectAltName",
                altNames: [
                  {
                    // type 2 is DNS
                    type: 2,
                    value: "localhost",
                  },
                  {
                    type: 2,
                    value: "localhost.localdomain",
                  },
                  {
                    type: 2,
                    value: "lvh.me",
                  },
                  {
                    type: 2,
                    value: "*.lvh.me",
                  },
                  {
                    type: 2,
                    value: "[::1]",
                  },
                  {
                    // type 7 is IP
                    type: 7,
                    ip: "127.0.0.1",
                  },
                  {
                    type: 7,
                    ip: "fe80::1",
                  },
                ],
              },
            ],
          });

          await fs.promises.mkdir(certificateDir, { recursive: true });

          await fs.promises.writeFile(
            certificatePath,
            pems.private + pems.cert,
            {
              encoding: "utf8",
            }
          );
        }

        fakeCert = await fs.promises.readFile(certificatePath);

        this.logger.info(`SSL certificate: ${certificatePath}`);
      }

      if (
        /** @type {ServerOptions & { cacert?: ServerOptions["ca"] }} */ (
          options.server.options
        ).cacert
      ) {
        if (/** @type {ServerOptions} */ (options.server.options).ca) {
          this.logger.warn(
            "Do not specify 'ca' and 'cacert' options together, the 'ca' option will be used."
          );
        } else {
          /** @type {ServerOptions} */
          (options.server.options).ca =
            /** @type {ServerOptions & { cacert?: ServerOptions["ca"] }} */
            (options.server.options).cacert;
        }

        delete (
          /** @type {ServerOptions & { cacert?: ServerOptions["ca"] }} */ (
            options.server.options
          ).cacert
        );
      }

      /** @type {ServerOptions} */
      (options.server.options).key =
        /** @type {ServerOptions} */
        (options.server.options).key || fakeCert;
      /** @type {ServerOptions} */
      (options.server.options).cert =
        /** @type {ServerOptions} */
        (options.server.options).cert || fakeCert;
    }

    /**
     * options.ipc：要侦听的 Unix 套接字（而不是主机）
     * 将其设置为 true 将会监听 /your-os-temp-dir/webpack-dev-server.sock 的 socket
     */
    if (typeof options.ipc === "boolean") {
      const isWindows = process.platform === "win32";
      const pipePrefix = isWindows ? "\\\\.\\pipe\\" : os.tmpdir();
      const pipeName = "webpack-dev-server.sock";

      options.ipc = path.join(pipePrefix, pipeName);
    }

    options.liveReload =
      typeof options.liveReload !== "undefined" ? options.liveReload : true;

    options.magicHtml =
      typeof options.magicHtml !== "undefined" ? options.magicHtml : true;

    
    /**
     * 下面的逻辑是规范化 devServer.open，最终规范为 NormalizedOpen[] 形式
     */
    // https://github.com/webpack/webpack-dev-server/issues/1990
    const defaultOpenOptions = { wait: false };
    /**
     * @param {any} target
     * @returns {NormalizedOpen[]}
     */
    // 获取 devServer.open 每项值，最终规整为 NormalizedOpen 形式
    // TODO: remove --open-app in favor of --open-app-name 删除 --open-app 改用 --open-app-name
    const getOpenItemsFromObject = ({ target, ...rest }) => {
      const normalizedOptions = { ...defaultOpenOptions, ...rest }; 

      if (typeof normalizedOptions.app === "string") {
        normalizedOptions.app = {
          name: normalizedOptions.app,
        };
      }

      const normalizedTarget = typeof target === "undefined" ? "<url>" : target;

      if (Array.isArray(normalizedTarget)) {
        return normalizedTarget.map((singleTarget) => {
          return { target: singleTarget, options: normalizedOptions };
        });
      }

      return [{ target: normalizedTarget, options: normalizedOptions }];
    };
    
    if (typeof options.open === "undefined") {
      /** @type {NormalizedOpen[]} */
      (options.open) = [];
    } else if (typeof options.open === "boolean") {
      /** @type {NormalizedOpen[]} */
      (options.open) = options.open
        ? [
            {
              target: "<url>",
              options: /** @type {OpenOptions} */ (defaultOpenOptions),
            },
          ]
        : [];
    } else if (typeof options.open === "string") {
      // 组成成
      /** @type {NormalizedOpen[]} */
      (options.open) = [{ target: options.open, options: defaultOpenOptions }];
    } else if (Array.isArray(options.open) /** 如果是数组形式 */) {
      /**
       * @type {NormalizedOpen[]}
       */
      const result = [];
      // 遍历所有的 open 选项
      options.open.forEach((item) => {
        // 如果数组项每项都是 string
        if (typeof item === "string") {
          // 则每项的配置项取默认值
          result.push({ target: item, options: defaultOpenOptions });

          return;
        }

        result.push(...getOpenItemsFromObject(item));
      });

      /** @type {NormalizedOpen[]} */
      (options.open) = result;
    } else {
      /** @type {NormalizedOpen[]} */
      // 其他形式 - 一般为对象形式
      (options.open) = [...getOpenItemsFromObject(options.open)];
    }

    if (options.onAfterSetupMiddleware) {
      // TODO: remove in the next major release
      util.deprecate(
        () => {},
        "'onAfterSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.",
        `DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE`
      )();
    }

    if (options.onBeforeSetupMiddleware) {
      // TODO: remove in the next major release
      util.deprecate(
        () => {},
        "'onBeforeSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.",
        `DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE`
      )();
    }

    if (typeof options.port === "string" && options.port !== "auto") {
      options.port = Number(options.port);
    }

    /**
     * Assume a proxy configuration specified as:
     * proxy: {
     *   'context': { options }
     * }
     * OR
     * proxy: {
     *   'context': 'target'
     * }
     */
    if (typeof options.proxy !== "undefined") {
      // TODO remove in the next major release, only accept `Array`
      if (!Array.isArray(options.proxy)) {
        if (
          Object.prototype.hasOwnProperty.call(options.proxy, "target") ||
          Object.prototype.hasOwnProperty.call(options.proxy, "router")
        ) {
          /** @type {ProxyConfigArray} */
          (options.proxy) = [/** @type {ProxyConfigMap} */ (options.proxy)];
        } else {
          /** @type {ProxyConfigArray} */
          (options.proxy) = Object.keys(options.proxy).map(
            /**
             * @param {string} context
             * @returns {HttpProxyMiddlewareOptions}
             */
            (context) => {
              let proxyOptions;
              // For backwards compatibility reasons.
              const correctedContext = context
                .replace(/^\*$/, "**")
                .replace(/\/\*$/, "");

              if (
                typeof (
                  /** @type {ProxyConfigMap} */ (options.proxy)[context]
                ) === "string"
              ) {
                proxyOptions = {
                  context: correctedContext,
                  target:
                    /** @type {ProxyConfigMap} */
                    (options.proxy)[context],
                };
              } else {
                proxyOptions = {
                  // @ts-ignore
                  .../** @type {ProxyConfigMap} */ (options.proxy)[context],
                };
                proxyOptions.context = correctedContext;
              }

              return proxyOptions;
            }
          );
        }
      }

      /** @type {ProxyConfigArray} */
      (options.proxy) =
        /** @type {ProxyConfigArray} */
        (options.proxy).map((item) => {
          if (typeof item === "function") {
            return item;
          }

          /**
           * @param {"info" | "warn" | "error" | "debug" | "silent" | undefined | "none" | "log" | "verbose"} level
           * @returns {"info" | "warn" | "error" | "debug" | "silent" | undefined}
           */
          const getLogLevelForProxy = (level) => {
            if (level === "none") {
              return "silent";
            }

            if (level === "log") {
              return "info";
            }

            if (level === "verbose") {
              return "debug";
            }

            return level;
          };

          if (typeof item.logLevel === "undefined") {
            item.logLevel = getLogLevelForProxy(
              compilerOptions.infrastructureLogging
                ? compilerOptions.infrastructureLogging.level
                : "info"
            );
          }

          if (typeof item.logProvider === "undefined") {
            item.logProvider = () => this.logger;
          }

          return item;
        });
    }

    if (typeof options.setupExitSignals === "undefined") {
      options.setupExitSignals = true;
    }

    /**
     * 规范化 devServer.static 配置项：该配置项允许配置从目录提供静态文件的选项（默认是 'public' 文件夹）。
     * 最终规范成数组形式：[{ 
     *    directory: ...,
     *    staticOptions: ...,
     *    publicPath: ...,
     *    serveIndex: ...,
     *    watch: ...
     *  }]
     */
    if (typeof options.static === "undefined" /** 如果没有配置，那么取默认值 */) {
      options.static = [getStaticItem()];
    } else if (typeof options.static === "boolean" /** 如果配置为布尔类型：true 取默认值 | false 表示禁用 */) {
      options.static = options.static ? [getStaticItem()] : false;
    } else if (typeof options.static === "string" /** 如果是 string: 则从这个目录下提供静态文件 */) {
      options.static = [getStaticItem(options.static)];
    } else if (Array.isArray(options.static) /** 如果是数组，则数组每项都规范一下 */) {
      options.static = options.static.map((item) => getStaticItem(item));
    } else {
      options.static = [getStaticItem(options.static)]; /** 其他情况，则直接获取 */
    }

    if (typeof options.watchFiles === "string") {
      options.watchFiles = [
        { paths: options.watchFiles, options: getWatchOptions() },
      ];
    } else if (
      typeof options.watchFiles === "object" &&
      options.watchFiles !== null &&
      !Array.isArray(options.watchFiles)
    ) {
      options.watchFiles = [
        {
          paths: options.watchFiles.paths,
          options: getWatchOptions(options.watchFiles.options || {}),
        },
      ];
    } else if (Array.isArray(options.watchFiles)) {
      options.watchFiles = options.watchFiles.map((item) => {
        if (typeof item === "string") {
          return { paths: item, options: getWatchOptions() };
        }

        return {
          paths: item.paths,
          options: getWatchOptions(item.options || {}),
        };
      });
    } else {
      options.watchFiles = [];
    }

    /** 以下为规范化 devServer.webSocketServer：该配置项允许我们选择当前的 web-socket 服务器或者提供自定义的 web-socket 服务器实现。  */
    const defaultWebSocketServerType = "ws";
    const defaultWebSocketServerOptions = { path: "/ws" };

    if (typeof options.webSocketServer === "undefined") {
      // 没有进行配置，则取默认值
      options.webSocketServer = {
        type: defaultWebSocketServerType, // 默认为 ws，使用 ws 作为服务器
        options: defaultWebSocketServerOptions,
      };
    } else if (
      typeof options.webSocketServer === "boolean" &&
      !options.webSocketServer
    ) {
      // 如果配置为 false，那么就相当于关闭 web-socket 服务器，不需要与客户端进行通信
      options.webSocketServer = false;
    } else if (
      typeof options.webSocketServer === "string" ||
      typeof options.webSocketServer === "function"
    ) {
      // 如果是字符串或函数，则就需要这个参数
      options.webSocketServer = {
        type: options.webSocketServer,
        options: defaultWebSocketServerOptions,
      };
    } else {
      // 其他情况下是对象，那么就规范一下这个对象
      options.webSocketServer = {
        type:
          /** @type {WebSocketServerConfiguration} */
          (options.webSocketServer).type || defaultWebSocketServerType,
        options: {
          ...defaultWebSocketServerOptions,
          .../** @type {WebSocketServerConfiguration} */
          (options.webSocketServer).options,
        },
      };

      const webSocketServer =
        /** @type {{ type: WebSocketServerConfiguration["type"], options: NonNullable<WebSocketServerConfiguration["options"]> }} */
        (options.webSocketServer);

      if (typeof webSocketServer.options.port === "string") {
        webSocketServer.options.port = Number(webSocketServer.options.port);
      }
    }
  }

  /**
   * @private
   * @returns {string}
   */
  getClientTransport() {
    let clientImplementation;
    let clientImplementationFound = true;

    const isKnownWebSocketServerImplementation =
      this.options.webSocketServer &&
      typeof (
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type
      ) === "string" &&
      // @ts-ignore
      (this.options.webSocketServer.type === "ws" ||
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type === "sockjs");

    let clientTransport;

    if (this.options.client) {
      if (
        typeof (
          /** @type {ClientConfiguration} */
          (this.options.client).webSocketTransport
        ) !== "undefined"
      ) {
        clientTransport =
          /** @type {ClientConfiguration} */
          (this.options.client).webSocketTransport;
      } else if (isKnownWebSocketServerImplementation) {
        clientTransport =
          /** @type {WebSocketServerConfiguration} */
          (this.options.webSocketServer).type;
      } else {
        clientTransport = "ws";
      }
    } else {
      clientTransport = "ws";
    }

    switch (typeof clientTransport) {
      case "string":
        // could be 'sockjs', 'ws', or a path that should be required
        if (clientTransport === "sockjs") {
          clientImplementation = require.resolve(
            "../client/clients/SockJSClient"
          );
        } else if (clientTransport === "ws") {
          clientImplementation = require.resolve(
            "../client/clients/WebSocketClient"
          );
        } else {
          try {
            clientImplementation = require.resolve(clientTransport);
          } catch (e) {
            clientImplementationFound = false;
          }
        }
        break;
      default:
        clientImplementationFound = false;
    }

    if (!clientImplementationFound) {
      throw new Error(
        `${
          !isKnownWebSocketServerImplementation
            ? "When you use custom web socket implementation you must explicitly specify client.webSocketTransport. " // 当你使用自定义web套接字实现时，你必须显式指定客户端。网络套接字传输
            : ""
        }client.webSocketTransport must be a string denoting a default implementation (e.g. 'sockjs', 'ws') or a full path to a JS file via require.resolve(...) which exports a class `
      );
    }

    return /** @type {string} */ (clientImplementation);
  }

  /**
   * 获取 web-socket 服务器的构造器，默认为 ws(require("./servers/WebsocketServer"))
   * @private
   * @returns {string}
   */
  getServerTransport() {
    let implementation;
    let implementationFound = true;

    switch (
      typeof (
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type // web-socket 服务器类型：默认为 ws 服务器
      )
    ) {
      case "string":
        // Could be 'sockjs', in the future 'ws', or a path that should be required 可能是'sockjs'，在未来的'ws'，或一个路径，应该是必需的
        if (
          /** @type {WebSocketServerConfiguration} */ (
            this.options.webSocketServer
          ).type === "sockjs"
        ) {
          // web-socket 服务器是 sockjs 类型
          implementation = require("./servers/SockJSServer");
        } else if (
          /** @type {WebSocketServerConfiguration} */ (
            this.options.webSocketServer
          ).type === "ws"
        ) {
          // web-socket 服务器是 ws 类型(默认值)
          implementation = require("./servers/WebsocketServer"); // 提取出对应的 ws 服务器构造器
        } else {
          try {
            // 其他情况下，让用户决定 web-socket 服务器构造器
            // eslint-disable-next-line import/no-dynamic-require
            implementation = require(/** @type {WebSocketServerConfiguration} */ (
              this.options.webSocketServer
            ).type);
          } catch (error) {
            implementationFound = false;
          }
        }
        break;
      case "function":
        // 如果是函数，那么就使用函数作为 web-socket 服务器构造器
        implementation = /** @type {WebSocketServerConfiguration} */ (
          this.options.webSocketServer
        ).type;
        break;
      default:
        implementationFound = false;
    }

    // 没有对应的 web-socket 服务器构造器，抛出错误
    if (!implementationFound) {
      throw new Error(
        "webSocketServer (webSocketServer.type) must be a string denoting a default implementation (e.g. 'ws', 'sockjs'), a full path to " + // web Socket Server (web Socket Server.type)必须是一个表示默认实现的字符串。'ws'， 'sockjs')的完整路径
          "a JS file which exports a class extending BaseServer (webpack-dev-server/lib/servers/BaseServer.js) " + // 一个JS文件，它导出一个扩展Base Server的类(webpack dev Server /lib/servers/ Base Server. JS)
          "via require.resolve(...), or the class itself which extends BaseServer" // 通过require.resolve(…)，或者扩展Base Server的类本身
      );
    }

    return implementation;
  }

  /**
   * 实现 devServer.client.progress：在浏览器中以百分比显示编译进度 -- 在控制台中打印编译进度
   * @private
   * @returns {void}
   */
  setupProgressPlugin() {
    const { ProgressPlugin } =
      /** @type {MultiCompiler}*/
      (this.compiler).compilers
        ? /** @type {MultiCompiler}*/ (this.compiler).compilers[0].webpack
        : /** @type {Compiler}*/ (this.compiler).webpack ||
          // TODO remove me after drop webpack v4
          require("webpack");

    new ProgressPlugin(
      /**
       * @param {number} percent
       * @param {string} msg
       * @param {string} addInfo
       * @param {string} pluginName
       */
      (percent, msg, addInfo, pluginName) => {
        percent = Math.floor(percent * 100);

        if (percent === 100) {
          msg = "Compilation completed";
        }

        if (addInfo) {
          msg = `${msg} (${addInfo})`;
        }

        if (this.webSocketServer) {
          this.sendMessage(this.webSocketServer.clients, "progress-update", {
            percent,
            msg,
            pluginName,
          });
        }

        if (this.server) {
          this.server.emit("progress-update", { percent, msg, pluginName });
        }
      }
    ).apply(this.compiler);
  }

  /**
   * 处理客户端实现 WebSocket 问题以及 hot 热更新问题
   *  1. WebSocket 问题：借助 webpack.EntryPlugin 插件添加 entry 入口，这样在客户端中就会与本地 ws 服务器通信
   *  2. hot 热更新问题：
   *          ->  添加 webpack/hot/only-dev-server(或 webpack/hot/dev-server，两者差异在构建失败时不刷新页面作为回退) 入口
   *          ->  以及添加一个 webpack.HotModuleReplacementPlugin 插件实现
   *  ---> 注意：
   *        对于服务器：创建一个 ws 服务器(或其他自定义服务器)，然后用于与客户端进行通信
   *        对于客户端：在下面会添加一个 entry 到客户端代码，这个 entry 在 ../client/ 文件夹中
   *        这样本地服务器和客户端就会建立 ws 通信，在文件变更时或其他变化时通知客户端做出相应的操作
   * 
   * 初始化服务器相关：
   *  -> 注册 Compiler.hooks 两个事件，主要用于通过 ws 通知客户端构建信息
   *  -> 设置一个 express 实例：express() 即可
   *  -> 监听所有的请求，检测 host 请求头部字段是否在白名单中，详情见：devServer.allowedHosts
   *  -> 设置生成一个 webpack-dev-middeware 中间件，后续用于代理编译资源
   *  -> 设置 express 路由，处理几个内部请求：这几个要在 webpack-dev-middleware 代理资源之前，因为要先处理这几个请求
   *      -> 1. /__webpack_dev_server__/sockjs.bundle.js：直接读取出 ../client/modules/sockjs-client/index.js 文件响应
   *      -> 2. /webpack-dev-server/invalidate：调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
   *      -> 3. /webpack-dev-server：返回所有的编译文件列表给客户端
   *  -> 配置 globs/directories/files 来监听文件变化，文件发生变更时通知客户端刷新：详情见 devServer.watchFiles
   *  -> 处理 devServer.static.watch 选项：通过 static.directory 配置项告诉 dev-server 监听文件。默认启用，文件更改将触发整个页面重新加载。
   *      -> 上面两个配置主要是没有被 webpack 监听的其他文件，在 webpack-dev-server 这一层进行监听
   *  -> 配置 express 中间件，例如代理服务器、静态目录、webpack-dev-middeware 中间件代理编译资源等等，详情见 setupMiddlewares 方法
   *  -> 使用 Node 的 http(https、http2)模块创建本地服务器实例，但是在这里暂时不启动监听连接
   * @private
   * @returns {Promise<void>}
   */
  async initialize() {
    /**
     * devServer.webSocketServer：选择当前的 web-socket 服务器或者提供自定义的 web-socket 服务器实现。默认使用 ws 作为服务器，客户端中的 WebSockets。
     * 
     *  注意：
     *    对于服务器：创建一个 ws 服务器(或其他自定义服务器)，然后用于与客户端进行通信
     *    对于客户端：在下面会添加一个 entry 到客户端代码，这个 entry 在 ../client/ 文件夹中
     *    这样本地服务器和客户端就会建立 ws 通信，在文件变更时或其他变化时通知客户端做出相应的操作
     */
    if (this.options.webSocketServer) {
      const compilers =
        /** @type {MultiCompiler} */
        (this.compiler).compilers || [this.compiler];

      /**
       * 处理客户端实现 WebSocket 问题以及 hot 热更新问题
       *  1. WebSocket 问题：借助 webpack.EntryPlugin 插件添加 entry 入口，这样在客户端中就会与本地 ws 服务器通信
       *  2. hot 热更新问题：
       *          ->  添加 webpack/hot/only-dev-server(或 webpack/hot/dev-server，两者差异在构建失败时不刷新页面作为回退) 入口
       *          ->  以及添加一个 webpack.HotModuleReplacementPlugin 插件实现
       */
      compilers.forEach((compiler) => {
        /**
         * 客户端实现与本地 ws 服务器进行通信，实现热更新等操作 --> 实现原理：Compiler 添加 entry，借助 webpack.EntryPlugin 插件即可实现
         *  1. `${require.resolve("../client/index.js")}?${webSocketURLStr}`：注入连接 ws 本地服务器进行通信。
         *      --> 通过 ?${webSocketURLStr} 方式传递 ws 服务器的 URL，在 ../client/index.js 文件中可以通过 __resourceQuery 获取到这个 URL，这样客户端就知道连接到哪个服务器
         *  2. webpack/hot/only-dev-server(或 webpack/hot/dev-server，两者差异在构建失败时不刷新页面作为回退)，用于客户端的热更新
         */
        this.addAdditionalEntries(compiler); // 为每个 Compiler 添加一个客户端入口

        const webpack = compiler.webpack || require("webpack");

        /**
         * webpack.ProvidePlugin：自动加载模块，而不必在任何地方导入或要求它们
         *    -> 例如下面 __webpack_dev_server_client__: xxx，这样的话，在 webpack 编译过程中，遇到 __webpack_dev_server_client__ 变量就会使用这个 this.getClientTransport() 表示的模块
         *    -> 在 ../client/socket.js 文件中会使用这个变量
         * 
         * 这里主要处理 devServer.client.webSocketURL 配置项，使用自定义的 WebSocket 服务器(需要兼容 ws 服务端)
         */
        new webpack.ProvidePlugin({
          // this.getClientTransport() 默认返回 'C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\node_modules\\webpack-dev-server\\client\\clients\\WebSocketClient.js'
          // 如果是自定义 WebSocket 的话，应该返回自定义服务器文件位置，webpack 就会对这个文件构建入项目中
          __webpack_dev_server_client__: this.getClientTransport(), 
        }).apply(compiler);

        // TODO remove after drop webpack v4 support 删除 webpack v4 支持
        compiler.options.plugins = compiler.options.plugins || [];

        // 支持热更新的话
        if (this.options.hot) {
          // 用户是否注册了 webpack.HotModuleReplacementPlugin 插件
          const HMRPluginExists = compiler.options.plugins.find(
            (p) => p.constructor === webpack.HotModuleReplacementPlugin
          );

          if (HMRPluginExists) {
            this.logger.warn(
              `"hot: true" automatically applies HMR plugin, you don't have to add it manually to your webpack configuration.` // hot: true"会自动应用HMR插件，你不需要手动添加到你的webpack配置中
            );
          } else {
            // Apply the HMR plugin 应用 HMR插件
            const plugin = new webpack.HotModuleReplacementPlugin(); 

            plugin.apply(compiler); // 添加一个 webpack 插件
          }
        }
      });

      // 实现 devServer.client.progress：在浏览器中以百分比显示编译进度 -- 在控制台中打印编译进度
      if (
        this.options.client &&
        /** @type {ClientConfiguration} */ (this.options.client).progress
      ) {
        this.setupProgressPlugin();
      }
    }

    /**
     * 注册 Compiler.hooks 两个事件：
     *  1. invalid：在一个观察中的 compilation 无效时执行(这个也会在 watch 模式下，第一个文件更改时触发)
     *  2. done：在 compilation 完成时执行。
     * 主要用于通知客户端构建信息
     */
    this.setupHooks();
    /**
     * 设置一个 express 实例：express() 即可
     */
    this.setupApp();
    /**
     * 监听所有的请求，检测 host 请求头部字段是否在白名单中，详情见：devServer.allowedHosts(https://webpack.docschina.org/configuration/dev-server/#devserverallowedhosts)
     *  1. 允许访问，通过
     *  2. 不允许访问，请求响应信息：Invalid Host header(无效的请求头)
     */
    this.setupHostHeaderCheck();
    /**
     * 设置生成一个 webpack-dev-middeware 中间件，后续用于代理编译资源：与 webpack 包一起使用的 express 样式的开发中间件，并允许提供从 webpack 发出的文件。详情见：webpack-dev-middeware：https://github.com/webpack/webpack-dev-middleware
     * 简单理解：也就是 webpack-dev-middware 会启动 Compiler.watch 方法进行监听并且进行资源构建，生成一个 express 中间件代理这些资源
     */
    this.setupDevMiddleware();
    /**
     * 设置 express 路由，处理几个内部请求：这几个要在 webpack-dev-middleware 代理资源之前，因为要先处理这几个请求
     *  1. /__webpack_dev_server__/sockjs.bundle.js：直接读取出 ../client/modules/sockjs-client/index.js 文件响应
     *  2. /webpack-dev-server/invalidate：调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
     *  3. /webpack-dev-server：返回所有的编译文件列表给客户端
     */
    // Should be after `webpack-dev-middleware`, otherwise other middlewares might rewrite response 应该在' webpack-dev-middleware'之后，否则其他中间件可能会重写响应
    this.setupBuiltInRoutes();
    /**
     * 设置配置 globs/directories/files 来监听文件变化：详情见 devServer.watchFiles(https://webpack.docschina.org/configuration/dev-server/#devserverwatchfiles)
     *  但是设置这些监听文件变化有什么作用呢？ -- 但是设置这些监听文件变化有什么作用呢？ -- 使用 chokidar 库来监听这些文件变化，在 devServer.liveReload 为 true 时会通过 ws 发送一条信息(static-changed)，客户端就会刷新页面(location.reload())
     */
    this.setupWatchFiles();
    /**
     * 处理 devServer.static.watch 选项：通过 static.directory 配置项告诉 dev-server 监听文件。默认启用，文件更改将触发整个页面重新加载。
     * WHY？ -- 这些配置的是静态文件(或文件夹)，这些文件更改是不会触发 HMR 的，所有可以在这里配置一下，在静态目录发生变更时触发一下页面更新
     */
    this.setupWatchStaticFiles();
    // 配置 express 中间件
    this.setupMiddlewares();
    // 使用 Node 的 http(https、http2)模块创建本地服务器实例，但是在这里暂时不启动监听连接
    this.createServer();

    /**
     * devServer.setupExitSignals：允许在 SIGINT 和 SIGTERM 信号时关闭开发服务器和退出进程。
     */
    if (this.options.setupExitSignals) {
      const signals = ["SIGINT", "SIGTERM"];

      let needForceShutdown = false;

      signals.forEach((signal) => {
        const listener = () => {
          if (needForceShutdown) {
            process.exit();
          }

          this.logger.info(
            "Gracefully shutting down. To force exit, press ^C again. Please wait..." // 优雅地关闭。再次按^C强制退出。请稍等
          );

          needForceShutdown = true;

          this.stopCallback(() => {
            if (typeof this.compiler.close === "function") {
              this.compiler.close(() => {
                process.exit();
              });
            } else {
              process.exit();
            }
          });
        };

        this.listeners.push({ name: signal, listener });

        process.on(signal, listener);
      });
    }

    /**
     * this.webSocketProxies： 是 devServer.proxy.ws 指定需要代理的 ws 服务器列表，在这里需要升级协议
     */
    // Proxy WebSocket without the initial http request 没有初始http请求的代理Web套接字
    // https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade
    /** @type {RequestHandler[]} */
    (this.webSocketProxies).forEach((webSocketProxy) => {
      /** @type {import("http").Server} */
      (this.server).on(
        "upgrade",
        /** @type {RequestHandler & { upgrade: NonNullable<RequestHandler["upgrade"]> }} */
        (webSocketProxy).upgrade
      );
    }, this);
  }

  /**
   * 设置一个 express 实例
   * @private
   * @returns {void}
   */
  setupApp() {
    /** @type {import("express").Application | undefined}*/
    // eslint-disable-next-line new-cap
    this.app = new /** @type {any} */ (express)();
  }

  /**
   * @private
   * @param {Stats | MultiStats} statsObj
   * @returns {StatsCompilation}
   */
  getStats(statsObj) {
    const stats = Server.DEFAULT_STATS;
    const compilerOptions = this.getCompilerOptions();

    // @ts-ignore
    if (compilerOptions.stats && compilerOptions.stats.warningsFilter) {
      // @ts-ignore
      stats.warningsFilter = compilerOptions.stats.warningsFilter;
    }

    return statsObj.toJson(stats);
  }

  /**
   * 注册 Compiler.hooks 两个事件：
   *  1. invalid：在一个观察中的 compilation 无效时执行(这个也会在 watch 模式下，第一个文件更改时触发)
   *  2. done：在 compilation 完成时执行。
   * 主要用于通知客户端构建信息
   * @private
   * @returns {void}
   */
  setupHooks() {
    /**
     * 在一个观察中的 compilation 无效时执行。
     * 这个也会在 watch 模式下，第一个文件更改时触发
     */
    this.compiler.hooks.invalid.tap("webpack-dev-server", () => {
      /**
       * 目前猜测下：应该是在有文件发生变更时通过 ws 通知客户端
       */
      if (this.webSocketServer) {
        this.sendMessage(this.webSocketServer.clients, "invalid");
      }
    });
    /**
     * 在 compilation 完成时执行。
     */
    this.compiler.hooks.done.tap(
      "webpack-dev-server",
      /**
       * @param {Stats | MultiStats} stats
       */
      (stats) => {
        /**
         * 目前猜测下：在编译完成后，将变更信息通过 ws 传递给客户端
         */
        if (this.webSocketServer) {
          this.sendStats(this.webSocketServer.clients, this.getStats(stats));
        }

        /**
         * @private
         * @type {Stats | MultiStats}
         */
        this.stats = stats;
      }
    );
  }

  /**
   * 监听所有的请求，检测 host 请求头部字段是否在白名单中，详情见：devServer.allowedHosts(https://webpack.docschina.org/configuration/dev-server/#devserverallowedhosts)
   * @private
   * @returns {void}
   */
  setupHostHeaderCheck() {
    /** @type {import("express").Application} */
    // all('*', function)：监听所有的路由，所有的请求都会经过这个方法
    (this.app).all(
      "*",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      (req, res, next) => {
        if (
          // 检测 host 请求头字段是否在白名单中
          this.checkHeader(
            /** @type {{ [key: string]: string | undefined }} */
            (req.headers), // 请求头
            "host" 
          )
        ) {
          return next();
        }

        res.send("Invalid Host header"); // 无效的主机头
      }
    );
  }

  /**
   * 设置 webpack-dev-middeware 代理编译资源，详情见：webpack-dev-middeware：https://github.com/webpack/webpack-dev-middleware
   * 简单理解：与 webpack 包一起使用的 express 样式的开发中间件，并允许提供从 webpack 发出的文件。
   * @private
   * @returns {void}
   */
  setupDevMiddleware() {
    const webpackDevMiddleware = require("webpack-dev-middleware");

    // middleware for serving webpack bundle 服务 webpack bundle的中间件
    this.middleware = webpackDevMiddleware(
      this.compiler,
      this.options.devMiddleware
    );
  }

  /**
   * 设置 express 路由，处理几个内部请求：
   *  1. /__webpack_dev_server__/sockjs.bundle.js：直接读取出 ../client/modules/sockjs-client/index.js 文件响应
   *  2. /webpack-dev-server/invalidate：调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
   *  3. /webpack-dev-server：返回所有的编译文件列表给客户端
   * @private
   * @returns {void}
   */
  setupBuiltInRoutes() {
    const { app, middleware } = this;

    /** @type {import("express").Application} */
    (app).get(
      "/__webpack_dev_server__/sockjs.bundle.js",
      /**
       * @param {Request} req
       * @param {Response} res
       * @returns {void}
       */
      (req, res) => {
        res.setHeader("Content-Type", "application/javascript");

        const { createReadStream } = fs;
        // 客户端文件目录
        const clientPath = path.join(__dirname, "..", "client");

        // 管道化读取 client/modules/sockjs-client/index.js 文件传递给客户端
        createReadStream(
          path.join(clientPath, "modules/sockjs-client/index.js")
        ).pipe(res);
      }
    );

    /** @type {import("express").Application} */
    (app).get(
      "/webpack-dev-server/invalidate",
      /**
       * @param {Request} _req
       * @param {Response} res
       * @returns {void}
       */
      (_req, res) => {
        // 调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
        this.invalidate();

        // 返回一个空信息
        res.end();
      }
    );

    /** @type {import("express").Application} */
    (app).get(
      "/webpack-dev-server",
      /**
       * @param {Request} req
       * @param {Response} res
       * @returns {void}
       */
      (req, res) => {
        /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
        // waitUntilValid：当编译器包有效时执行回调函数，通常是在编译之后。
        (middleware).waitUntilValid((stats) => {
          // 编译完成后，将编译后的资源列表返回给客户端
          res.setHeader("Content-Type", "text/html");
          res.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>'
          );

          const statsForPrint =
            typeof (/** @type {MultiStats} */ (stats).stats) !== "undefined"
              ? /** @type {MultiStats} */ (stats).toJson().children
              : [/** @type {Stats} */ (stats).toJson()];

          res.write(`<h1>Assets Report:</h1>`);

          /**
           * @type {StatsCompilation[]}
           */
          (statsForPrint).forEach((item, index) => {
            res.write("<div>");

            const name =
              // eslint-disable-next-line no-nested-ternary
              typeof item.name !== "undefined"
                ? item.name
                : /** @type {MultiStats} */ (stats).stats
                ? `unnamed[${index}]`
                : "unnamed";

            res.write(`<h2>Compilation: ${name}</h2>`);
            res.write("<ul>");

            const publicPath =
              item.publicPath === "auto" ? "" : item.publicPath;

            for (const asset of /** @type {NonNullable<StatsCompilation["assets"]>} */ (
              item.assets
            )) {
              const assetName = asset.name;
              const assetURL = `${publicPath}${assetName}`;

              res.write(
                `<li>
              <strong><a href="${assetURL}" target="_blank">${assetName}</a></strong>
            </li>`
              );
            }

            res.write("</ul>");
            res.write("</div>");
          });

          res.end("</body></html>");
        });
      }
    );
  }

  /**
   * 处理 devServer.static.watch 选项：通过 static.directory 配置项告诉 dev-server 监听文件。默认启用，文件更改将触发整个页面重新加载。
   * WHY？ -- 这些配置的是静态文件(或文件夹)，这些文件更改是不会触发 HMR 的，所有可以在这里配置一下，在静态目录发生变更时触发一下页面更新
   * @private
   * @returns {void}
   */
  setupWatchStaticFiles() {
    if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
      /** @type {NormalizedStatic[]} */
      // 遍历 options.static(会被规范为数组形式)
      (this.options.static).forEach((staticOption) => {
        if (staticOption.watch) {
          this.watchFiles(staticOption.directory, staticOption.watch);
        }
      });
    }
  }

  /**
   * 设置配置 globs/directories/files 来监听文件变化：详情见 devServer.watchFiles(https://webpack.docschina.org/configuration/dev-server/#devserverwatchfiles)
   *  但是设置这些监听文件变化有什么作用呢？ -- 使用 chokidar 库来监听这些文件变化，在 devServer.liveReload 为 true 时会通过 ws 发送一条信息(static-changed)，客户端就会刷新页面(location.reload())
   * @private
   * @returns {void}
   */
  setupWatchFiles() {
    const { watchFiles } = this.options;

    if (/** @type {WatchFiles[]} */ (watchFiles).length > 0) {
      /** @type {WatchFiles[]} */
      (watchFiles).forEach((item) => {
        this.watchFiles(item.paths, item.options);
      });
    }
  }

  /**
   * 注册中间件，注意以下中间件的顺序，在前面的首先进行响应
   *  -> devServer.compress：启用压缩 -- 使用 compression 库作为中间件
   *  -> devServer.onBeforeSetupMiddleware：提供在服务器内部执行所有其他中间件之前执行自定义中间件的能力 -- 直接执行 devServer.onBeforeSetupMiddleware 方法，让用户决定注册中间件
   *  -> devServer.headers：为所有响应添加 headers - 自定义一个中间件，直接使用 res.setHeader 添加即可
   *  -> webpack-dev-middleware 中间件：代理所有的构建资源 -- 使用 this.middleware(webpack-dev-middleware 生成的中间件)
   *  -> devServer.proxy：服务器代理
   *  -> devServer.static：静态文件目录中间件 -- 利用 exress.static 提供静态目录服务
   *  -> devServer.historyApiFallback：使用 HTML5 History API 时，可能必须提供 index.html 页面来代替任何 404 响应。通过将 devServer.historyApiFallback 设置为 true 来启用它
   *      --> 使用 connect-history-api-fallback 库中间件
   *  -> devServer.static.serveIndex：告诉开发服务器启用后使用 serveIndex 中间件，会在查看没有 index.html 文件的目录时生成目录列表。
   *      --> 使用 serve-index 中间件，在访问静态目录时会生成目录列表
   *  -> devServer.magicHtml：告诉 dev-server 启用/禁用魔术 HTML 路由（与您的 webpack 输出相对应的路由，例如 main.js 的 /main）
   *      --> 实现 devServer.magicHtml 中间件： 告诉 dev-server 启用/禁用魔术 HTML 路由（与您的 webpack 输出相对应的路由，例如 main.js 的 /main）
   *      -->  -> 1. 获取到请求路径拼接 .js，利用 this.middleware 判断一下这个文件是否存在
   *      -->  -> 2. 文件存在则提供一个执行javascript的页面
   *  -> devServer.setupMiddlewares：提供执行自定义函数和应用自定义中间件的能力 -- 执行 devServer.setupMiddlewares 函数，让用户决定注册中间件
   *  ----> 获取到所有的中间件，注册这些中间件 -- 通过 this.app.use 注册即可
   *  -> devServer.onAfterSetupMiddleware：提供服务器内部在所有其他中间件之后执行 自定义中间件的能力 -- 直接执行 devServer.onAfterSetupMiddleware 方法，让用户决定注册中间件
   */
  setupMiddlewares() {
    /**
     * @type {Array<Middleware>}
     */
    let middlewares = []; // express 中间件集合

    // devServer.compress：启用压缩 -- 使用 compression 库作为中间件
    // compress is placed last and uses unshift so that it will be the first middleware used 压缩放在最后，并使用 unshift，这样它将是第一个使用的中间件
    if (this.options.compress) {
      const compression = require("compression");

      middlewares.push({ name: "compression", middleware: compression() });
    }
    // devServer.onBeforeSetupMiddleware：提供在服务器内部执行所有其他中间件之前执行自定义中间件的能力。
    if (typeof this.options.onBeforeSetupMiddleware === "function") {
      this.options.onBeforeSetupMiddleware(this);
    }

    // devServer.headers：为所有响应添加 headers - 自定义一个中间件，直接使用 res.setHeader 添加即可
    if (typeof this.options.headers !== "undefined") {
      middlewares.push({
        name: "set-headers",
        path: "*",
        middleware: this.setHeaders.bind(this), // 添加响应头字段中间件
      });
    }

    // webpack-dev-middleware 中间件：代理所有的构建资源 -- 使用 this.middleware(webpack-dev-middleware 生成的中间件)
    middlewares.push({
      name: "webpack-dev-middleware",
      middleware:
        /** @type {import("webpack-dev-middleware").Middleware<Request, Response>}*/
        (this.middleware),
    });

    // devServer.proxy：服务代理 -- 后续查看
    if (this.options.proxy) {
      const { createProxyMiddleware } = require("http-proxy-middleware");

      /**
       * @param {ProxyConfigArrayItem} proxyConfig
       * @returns {RequestHandler | undefined}
       */
      const getProxyMiddleware = (proxyConfig) => {
        // It is possible to use the `bypass` method without a `target` or `router`.
        // However, the proxy middleware has no use in this case, and will fail to instantiate.
        if (proxyConfig.target) {
          const context = proxyConfig.context || proxyConfig.path;

          return createProxyMiddleware(
            /** @type {string} */ (context),
            proxyConfig
          );
        }

        if (proxyConfig.router) {
          return createProxyMiddleware(proxyConfig);
        }
      };

      /**
       * Assume a proxy configuration specified as:
       * proxy: [
       *   {
       *     context: "value",
       *     ...options,
       *   },
       *   // or:
       *   function() {
       *     return {
       *       context: "context",
       *       ...options,
       *     };
       *   }
       * ]
       */
      /** @type {ProxyConfigArray} */
      (this.options.proxy).forEach((proxyConfigOrCallback) => {
        /**
         * @type {RequestHandler}
         */
        let proxyMiddleware;

        let proxyConfig =
          typeof proxyConfigOrCallback === "function"
            ? proxyConfigOrCallback()
            : proxyConfigOrCallback;

        proxyMiddleware =
          /** @type {RequestHandler} */
          (getProxyMiddleware(proxyConfig));

        if (proxyConfig.ws) {
          this.webSocketProxies.push(proxyMiddleware);
        }

        /**
         * @param {Request} req
         * @param {Response} res
         * @param {NextFunction} next
         * @returns {Promise<void>}
         */
        const handler = async (req, res, next) => {
          if (typeof proxyConfigOrCallback === "function") {
            const newProxyConfig = proxyConfigOrCallback(req, res, next);

            if (newProxyConfig !== proxyConfig) {
              proxyConfig = newProxyConfig;
              proxyMiddleware =
                /** @type {RequestHandler} */
                (getProxyMiddleware(proxyConfig));
            }
          }

          // - Check if we have a bypass function defined
          // - In case the bypass function is defined we'll retrieve the
          // bypassUrl from it otherwise bypassUrl would be null
          // TODO remove in the next major in favor `context` and `router` options
          const isByPassFuncDefined = typeof proxyConfig.bypass === "function";
          const bypassUrl = isByPassFuncDefined
            ? await /** @type {ByPass} */ (proxyConfig.bypass)(
                req,
                res,
                proxyConfig
              )
            : null;

          if (typeof bypassUrl === "boolean") {
            // skip the proxy
            // @ts-ignore
            req.url = null;
            next();
          } else if (typeof bypassUrl === "string") {
            // byPass to that url
            req.url = bypassUrl;
            next();
          } else if (proxyMiddleware) {
            return proxyMiddleware(req, res, next);
          } else {
            next();
          }
        };

        middlewares.push({
          name: "http-proxy-middleware",
          middleware: handler,
        });
        // Also forward error requests to the proxy so it can handle them.
        middlewares.push({
          name: "http-proxy-middleware-error-handler",
          middleware:
            /**
             * @param {Error} error
             * @param {Request} req
             * @param {Response} res
             * @param {NextFunction} next
             * @returns {any}
             */
            (error, req, res, next) => handler(req, res, next),
        });
      });

      middlewares.push({
        name: "webpack-dev-middleware",
        middleware:
          /** @type {import("webpack-dev-middleware").Middleware<Request, Response>}*/
          (this.middleware),
      });
    }

    // devServer.static：静态文件目录中间件 -- 利用 exress.static 提供静态目录服务
    if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
      /** @type {NormalizedStatic[]} */
      (this.options.static).forEach((staticOption) => {
        // devServer.static.publicPath：告诉服务器在哪个 URL 上提供 static.directory 的内容。
        staticOption.publicPath.forEach((publicPath) => {
          middlewares.push({
            name: "express-static",
            path: publicPath, // 代理 URL
            // express.static：这是 Express 中内置的中间件功能。它提供静态文件并基于serve-static。
            middleware: express.static(
              staticOption.directory, // 目录名
              staticOption.staticOptions // 选项
            ),
          });
        });
      });
    }

    /**
     * devServer.historyApiFallback：使用 HTML5 History API 时，可能必须提供 index.html 页面来代替任何 404 响应。通过将 devServer.historyApiFallback 设置为 true 来启用它
     *  -> 使用 connect-history-api-fallback 库中间件
     */
    if (this.options.historyApiFallback) {
      const connectHistoryApiFallback = require("connect-history-api-fallback");
      const { historyApiFallback } = this.options;

      // 添加一个 logger 打印类
      if (
        typeof (
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback).logger
        ) === "undefined" &&
        !(
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback).verbose
        )
      ) {
        // @ts-ignore
        historyApiFallback.logger = this.logger.log.bind(
          this.logger,
          "[connect-history-api-fallback]"
        );
      }

      // Fall back to /index.html if nothing else matches. 如果没有其他匹配项，则返回/index.html
      middlewares.push({
        name: "connect-history-api-fallback",
        middleware: connectHistoryApiFallback(
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback)
        ),
      });

      /**
       * 这下面的逻辑是为了保证 connect-history-api-fallback 中间件重写请求时能够处理相应的请求
       */
      // include our middleware to ensure 包括我们的中间件来确保
      // it is able to handle '/index.html' request after redirect 它能够处理重定向后的'/index.html'请求
      middlewares.push({
        name: "webpack-dev-middleware",
        middleware:
          /** @type {import("webpack-dev-middleware").Middleware<Request, Response>}*/
          (this.middleware),
      });

      if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
        /** @type {NormalizedStatic[]} */
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

    /**
     * devServer.static.serveIndex：告诉开发服务器启用后使用 serveIndex 中间件，会在查看没有 index.html 文件的目录时生成目录列表。
     *  -> 使用 serve-index 中间件，在访问静态目录时会生成目录列表
     */
    if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
      const serveIndex = require("serve-index");

      /** @type {NormalizedStatic[]} */
      (this.options.static).forEach((staticOption) => {
        staticOption.publicPath.forEach((publicPath) => {
          // 如果启用 serve-index 中间件的话
          if (staticOption.serveIndex) {
            middlewares.push({
              name: "serve-index",
              path: publicPath,
              /**
               * @param {Request} req
               * @param {Response} res
               * @param {NextFunction} next
               * @returns {void}
               */
              middleware: (req, res, next) => {
                // 不是 GET、HEAD 请求，放行
                // serve-index doesn't fallthrough non-get/head request to next middleware 服务索引不会通过下一个中间件的非get/head请求而失效
                if (req.method !== "GET" && req.method !== "HEAD") {
                  return next();
                }

                // 使用 serve-index 实现
                serveIndex(
                  staticOption.directory,
                  /** @type {ServeIndexOptions} */
                  (staticOption.serveIndex)
                )(req, res, next);
              },
            });
          }
        });
      });
    }

    /**
     * devServer.magicHtml：告诉 dev-server 启用/禁用魔术 HTML 路由（与您的 webpack 输出相对应的路由，例如 main.js 的 /main）
     * 实现 devServer.magicHtml 中间件： 告诉 dev-server 启用/禁用魔术 HTML 路由（与您的 webpack 输出相对应的路由，例如 main.js 的 /main）
     *  -> 1. 获取到请求路径拼接 .js，利用 this.middleware 判断一下这个文件是否存在
     *  -> 2. 文件存在则提供一个执行javascript的页面
     */
    if (this.options.magicHtml) {
      middlewares.push({
        name: "serve-magic-html",
        middleware: this.serveMagicHtml.bind(this),
      });
    }

    /**
     * devServer.setupMiddlewares：提供执行自定义函数和应用自定义中间件的能力 -- 执行 devServer.setupMiddlewares 函数
     */
    if (typeof this.options.setupMiddlewares === "function") {
      middlewares = this.options.setupMiddlewares(middlewares, this);
    }


    // 获取到所有的中间件，注册这些中间件 -- 通过 this.app.use 注册即可
    middlewares.forEach((middleware) => {
      if (typeof middleware === "function") {
        /** @type {import("express").Application} */
        (this.app).use(middleware);
      } else if (typeof middleware.path !== "undefined") {
        /** @type {import("express").Application} */
        (this.app).use(middleware.path, middleware.middleware);
      } else {
        /** @type {import("express").Application} */
        (this.app).use(middleware.middleware);
      }
    });

    // devServer.onAfterSetupMiddleware：提供服务器内部在所有其他中间件之后执行 自定义中间件的能力 -- 直接执行 devServer.onAfterSetupMiddleware 方法
    if (typeof this.options.onAfterSetupMiddleware === "function") {
      this.options.onAfterSetupMiddleware(this);
    }
  }

  /**
   * 使用 Node 的 http(https、http2)模块创建本地服务器实例，但是在这里暂时不启动监听连接
   * @private
   * @returns {void}
   */
  createServer() {
    // devServer.server：允许设置服务器和配置项（默认为 'http'）
    const { type, options } = /** @type {ServerConfiguration} */ (
      this.options.server
    );

    /** @type {import("http").Server | undefined | null} */
    // 使用 node 的 http(https 等服务器模块)创建本地服务器
    // eslint-disable-next-line import/no-dynamic-require
    this.server = require(/** @type {string} */ (type)).createServer(
      options,
      this.app // express 实例，用于处理请求
    );

    /**
     * connection：服务器事件，当建立新的 TCP 流时会触发此事件。-- http://nodejs.cn/api/http.html#event-connection
     *  用于添加所有 socket，在 stop 服务器的时候手动销毁 socket
     */
    /** @type {import("http").Server} */
    (this.server).on(
      "connection",
      /**
       * @param {Socket} socket
       */
      (socket) => {
        // Add socket to list 添加 socket 到列表
        this.sockets.push(socket);

        socket.once("close", () => {
          // Remove socket from list 从列表中删除 socket
          this.sockets.splice(this.sockets.indexOf(socket), 1);
        });
      }
    );

    /**
     * error：发生错误事件
     */
    /** @type {import("http").Server} */
    (this.server).on(
      "error",
      /**
       * @param {Error} error
       */
      (error) => {
        throw error; // 抛出错误
      }
    );
  }

  /**
   * 根据 devServer.webSocketServer 配置创建一个 web-socket 服务器(以下默认为 ws 服务器)
   * 在客户端与 ws 服务器进行连接时，完成如下事情：
   *    1. 检测请求头部字段：host、origin 是否合法 
   *    2. 当客户端需要这些功能时，发送一条消息给客户端表明客户端支持这些功能：
   *         -> hot：启用热更新 
   *         -> liveReload：当监听到文件(一般为额外文件)变化时 dev-server 将会重新加载或刷新页面。
   *         -> progress：在浏览器中以百分比显示编译进度。
   *         -> reconnect：尝试重新连接客户端的次数
   *         -> overlay：当出现编译错误或警告时，在浏览器中显示全屏覆盖。
   *         -> 以及如果此时存在构建信息时，根据构建结果发送构建数据给客户端
   * @private
   * @returns {void}
   */
  // TODO: remove `--web-socket-server` in favor of `--web-socket-server-type` 删除 `--web-socket-server`，改为 `--web-socket-server-type`
  createWebSocketServer() {
    /**
     * this.getServerTransport()：获取 web-socket 服务器的构造器，默认为 ws(require("./servers/WebsocketServer"))
     * 
     * 然后随之 new 一个 web-socket 服务器(以下默认为 ws 服务器)，这里主要生成一个 ws 服务器以及监听相关事件处理连接，与主逻辑关联不大
     */
    /** @type {WebSocketServerImplementation | undefined | null} */
    this.webSocketServer = new /** @type {any} */ (this.getServerTransport())(
      this
    );
    /**
     * connection 事件：握手完成时触发
     *  1. 检测请求头部字段：host、origin 是否合法 
     *  2. 当客户端需要这些功能时，发送一条消息给客户端表明客户端支持这些功能：
     *      -> hot：启用热更新 
     *      -> liveReload：当监听到文件(一般为额外文件)变化时 dev-server 将会重新加载或刷新页面。
     *      -> progress：在浏览器中以百分比显示编译进度。
     *      -> reconnect：尝试重新连接客户端的次数
     *      -> overlay：当出现编译错误或警告时，在浏览器中显示全屏覆盖。
     *      -> 以及如果此时存在构建信息时，根据构建结果发送构建数据给客户端
     */
    /** @type {WebSocketServerImplementation} */
    (this.webSocketServer).implementation.on(
      "connection",
      /**
       * @param {ClientConnection} client
       * @param {IncomingMessage} request
       */
      (client, request) => {
        // 提取出请求头
        /** @type {{ [key: string]: string | undefined } | undefined} */
        const headers =
          // eslint-disable-next-line no-nested-ternary
          typeof request !== "undefined"
            ? /** @type {{ [key: string]: string | undefined }} */
              (request.headers)
            : typeof (
                /** @type {import("sockjs").Connection} */ (client).headers
              ) !== "undefined"
            ? /** @type {import("sockjs").Connection} */ (client).headers
            : // eslint-disable-next-line no-undefined
              undefined;

        if (!headers) {
          this.logger.warn(
            'webSocketServer implementation must pass headers for the "connection" event' // webSocketServer 实现必须传递“连接”事件的头部
          );
        }

        // 请求头无效 -- 验证 host、origin 请求头
        if (
          !headers ||
          !this.checkHeader(headers, "host") ||
          !this.checkHeader(headers, "origin")
        ) {
          this.sendMessage([client], "error", "Invalid Host/Origin header");

          // With https enabled, the sendMessage above is encrypted asynchronously so not yet sent 启用 https 后，上面的 send Message 是异步加密的，所以还没有发送
          // Terminate would prevent it sending, so use close to allow it to be sent Terminate 命令会阻止发送，所以使用 close 命令允许发送
          client.close();

          return;
        }
        
        // 客户端需要热更新
        if (this.options.hot === true || this.options.hot === "only") {
          this.sendMessage([client], "hot");
        }

        // liveReload：当监听到文件变化(一般为其他文件时)时 dev-server 将会重新加载或刷新页面。
        if (this.options.liveReload) {
          this.sendMessage([client], "liveReload");
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */
          (this.options.client).progress
        ) {
          this.sendMessage(
            [client],
            "progress",
            /** @type {ClientConfiguration} */
            (this.options.client).progress
          );
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */ (this.options.client).reconnect
        ) {
          this.sendMessage(
            [client],
            "reconnect",
            /** @type {ClientConfiguration} */
            (this.options.client).reconnect
          );
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */
          (this.options.client).overlay
        ) {
          this.sendMessage(
            [client],
            "overlay",
            /** @type {ClientConfiguration} */
            (this.options.client).overlay
          );
        }

        if (!this.stats) {
          return;
        }

        this.sendStats([client], this.getStats(this.stats), true);
      }
    );
  }

  /**
   * 在服务开启后打开浏览器
   * 遍历 devServer.open，拼接一个完成 URL，借助 open 库实现功能
   * @private
   * @param {string} defaultOpenTarget
   * @returns {void}
   */
  openBrowser(defaultOpenTarget /** 打开的 URL，不包括路径：http://localhost:8082/ */) {
    const open = require("open");

    Promise.all(
      /** @type {NormalizedOpen[]} */
      (this.options.open).map((item) => {
        /**
         * @type {string}
         */
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
          this.logger.warn(
            `Unable to open "${openTarget}" page${
              item.options.app
                ? ` in "${
                    /** @type {import("open").App} */
                    (item.options.app).name
                  }" app${
                    /** @type {import("open").App} */
                    (item.options.app).arguments
                      ? ` with "${
                          /** @type {import("open").App} */
                          (item.options.app).arguments.join(" ")
                        }" arguments`
                      : ""
                  }`
                : ""
            }. If you are running in a headless environment, please do not use the "open" option or related flags like "--open", "--open-target", and "--open-app".`
          );
        });
      })
    );
  }

  /**
   * @private
   * @returns {void}
   */
  runBonjour() {
    const { Bonjour } = require("bonjour-service");
    /**
     * @private
     * @type {Bonjour | undefined}
     */
    this.bonjour = new Bonjour();
    this.bonjour.publish({
      // @ts-expect-error
      name: `Webpack Dev Server ${os.hostname()}:${this.options.port}`,
      // @ts-expect-error
      port: /** @type {number} */ (this.options.port),
      // @ts-expect-error
      type:
        /** @type {ServerConfiguration} */
        (this.options.server).type === "http" ? "http" : "https",
      subtypes: ["webpack"],
      .../** @type {BonjourOptions} */ (this.options.bonjour),
    });
  }

  /**
   * @private
   * @returns {void}
   */
  stopBonjour(callback = () => {}) {
    /** @type {Bonjour} */
    (this.bonjour).unpublishAll(() => {
      /** @type {Bonjour} */
      (this.bonjour).destroy();

      if (callback) {
        callback();
      }
    });
  }

  /**
   * @private
   * @returns {void}
   */
  logStatus() {
    const { isColorSupported, cyan, red } = require("colorette"); // colorette：设置终端文本颜色和样式。

    /**
     * 获取输出信息的颜色配置(stats.colors)
     * @param {Compiler["options"]} compilerOptions
     * @returns {boolean}
     */
    const getColorsOption = (compilerOptions /** Compiler 配置项(规范化后的 webpack 配置项) */) => {
      /**
       * @type {boolean}
       */
      let colorsEnabled;

      if (
        compilerOptions.stats &&
        typeof (/** @type {StatsOptions} */ (compilerOptions.stats).colors) !==
          "undefined"
      ) {
        colorsEnabled =
          /** @type {boolean} */
          (/** @type {StatsOptions} */ (compilerOptions.stats).colors);
      } else {
        colorsEnabled = isColorSupported;
      }

      return colorsEnabled;
    };

    const colors = {
      /**
       * @param {boolean} useColor
       * @param {string} msg
       * @returns {string}
       */
      info(useColor, msg) {
        if (useColor) {
          return cyan(msg);
        }

        return msg;
      },
      /**
       * @param {boolean} useColor
       * @param {string} msg
       * @returns {string}
       */
      error(useColor, msg) {
        if (useColor) {
          return red(msg);
        }

        return msg;
      },
    };
    // 获取输入信息的颜色配置
    const useColor = getColorsOption(this.getCompilerOptions());

    if (this.options.ipc) {
      this.logger.info(
        `Project is running at: "${
          /** @type {import("http").Server} */
          (this.server).address()
        }"`
      );
    } else {
      const protocol =
        /** @type {ServerConfiguration} */
        (this.options.server).type === "http" ? "http" : "https"; // 协议
      const { address, port } =
        /** @type {import("net").AddressInfo} */
        (
          /** @type {import("http").Server} */
          (this.server).address()
        ); // 域名和端口
      /**
       * @param {string} newHostname
       * @returns {string}
       */
      const prettyPrintURL = (newHostname) =>
        url.format({ protocol, hostname: newHostname, port, pathname: "/" });

      let server;
      let localhost; // 本机 localhost 地址："http://localhost:8081/"
      let loopbackIPv4;
      let loopbackIPv6;
      let networkUrlIPv4; // 本地 IP v4 地址："http://192.168.251.119:8081/"
      let networkUrlIPv6;

      if (this.options.host) {
        if (this.options.host === "localhost") {
          localhost = prettyPrintURL("localhost");
        } else {
          let isIP;

          try {
            isIP = ipaddr.parse(this.options.host);
          } catch (error) {
            // Ignore
          }

          if (!isIP) {
            server = prettyPrintURL(this.options.host);
          }
        }
      }

      const parsedIP = ipaddr.parse(address);

      if (parsedIP.range() === "unspecified") {
        localhost = prettyPrintURL("localhost");

        const networkIPv4 = Server.internalIPSync("v4");

        if (networkIPv4) {
          networkUrlIPv4 = prettyPrintURL(networkIPv4);
        }

        const networkIPv6 = Server.internalIPSync("v6");

        if (networkIPv6) {
          networkUrlIPv6 = prettyPrintURL(networkIPv6);
        }
      } else if (parsedIP.range() === "loopback") {
        if (parsedIP.kind() === "ipv4") {
          loopbackIPv4 = prettyPrintURL(parsedIP.toString());
        } else if (parsedIP.kind() === "ipv6") {
          loopbackIPv6 = prettyPrintURL(parsedIP.toString());
        }
      } else {
        networkUrlIPv4 =
          parsedIP.kind() === "ipv6" &&
          /** @type {IPv6} */
          (parsedIP).isIPv4MappedAddress()
            ? prettyPrintURL(
                /** @type {IPv6} */
                (parsedIP).toIPv4Address().toString()
              )
            : prettyPrintURL(address);

        if (parsedIP.kind() === "ipv6") {
          networkUrlIPv6 = prettyPrintURL(address);
        }
      }

      this.logger.info("Project is running at:");

      if (server) {
        this.logger.info(`Server: ${colors.info(useColor, server)}`);
      }

      if (localhost || loopbackIPv4 || loopbackIPv6) {
        const loopbacks = [];

        if (localhost) {
          loopbacks.push([colors.info(useColor, localhost)]);
        }

        if (loopbackIPv4) {
          loopbacks.push([colors.info(useColor, loopbackIPv4)]);
        }

        if (loopbackIPv6) {
          loopbacks.push([colors.info(useColor, loopbackIPv6)]);
        }

        this.logger.info(`Loopback: ${loopbacks.join(", ")}`);
      }

      if (networkUrlIPv4) {
        this.logger.info(
          `On Your Network (IPv4): ${colors.info(useColor, networkUrlIPv4)}`
        );
      }

      if (networkUrlIPv6) {
        this.logger.info(
          `On Your Network (IPv6): ${colors.info(useColor, networkUrlIPv6)}`
        );
      }

      // 如果 devServer.open 存在值，说明需要在服务开启后打开浏览器
      if (/** @type {NormalizedOpen[]} */ (this.options.open).length > 0) {
        const openTarget = prettyPrintURL(this.options.host || "localhost"); // 打开的 URL：http://localhost:8082/

        this.openBrowser(openTarget);
      }
    }

    if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
      this.logger.info(
        `Content not from webpack is served from '${colors.info(
          useColor,
          /** @type {NormalizedStatic[]} */
          (this.options.static)
            .map((staticOption) => staticOption.directory)
            .join(", ")
        )}' directory`
      );
    }

    if (this.options.historyApiFallback) {
      this.logger.info(
        `404s will fallback to '${colors.info(
          useColor,
          /** @type {ConnectHistoryApiFallbackOptions} */ (
            this.options.historyApiFallback
          ).index || "/index.html"
        )}'`
      );
    }

    if (this.options.bonjour) {
      const bonjourProtocol =
        /** @type {BonjourOptions} */
        (this.options.bonjour).type ||
        /** @type {ServerConfiguration} */
        (this.options.server).type === "http"
          ? "http"
          : "https";

      this.logger.info(
        `Broadcasting "${bonjourProtocol}" with subtype of "webpack" via ZeroConf DNS (Bonjour)`
      );
    }
  }

  /**
   * 为请求添加响应头字段
   * @private 
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  setHeaders(req, res, next) {
    let { headers } = this.options; // 提取出需要添加的响应头字段列表

    if (headers) {
      // 如果是函数，则调用这个函数
      if (typeof headers === "function") {
        headers = headers(
          req,
          res,
          /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
          (this.middleware).context
        );
      }

      /**
       * @type {{key: string, value: string}[]}
       */
      const allHeaders = [];

      // devServer.headers 不是数组形式，先整理成数组形式
      if (!Array.isArray(headers)) {
        // eslint-disable-next-line guard-for-in
        for (const name in headers) {
          // @ts-ignore
          allHeaders.push({ key: name, value: headers[name] });
        }

        headers = allHeaders;
      }

      // 遍历 headers 数组，直接添加即可
      headers.forEach(
        /**
         * @param {{key: string, value: any}} header
         */
        (header) => {
          res.setHeader(header.key, header.value);
        }
      );
    }

    next();
  }

  /**
   * @private
   * @param {{ [key: string]: string | undefined }} headers
   * @param {string} headerToCheck
   * @returns {boolean}
   */
  checkHeader(headers /** 请求头字段集合 */, headerToCheck /** 需要检查的请求头字段 */) {
    // allow user to opt out of this security check, at their own risk 允许用户选择退出此安全检查，风险自负
    // by explicitly enabling allowedHosts 通过显式启用允许的主机
    if (this.options.allowedHosts === "all") {
      return true;
    }

    // get the Host header and extract hostname 获取Host头并提取主机名
    // we don't care about port not matching 我们不关心端口不匹配
    const hostHeader = headers[headerToCheck];

    if (!hostHeader) {
      return false;
    }

    // 对于 file: 协议或 extension(?) 协议，直接 true
    if (/^(file|.+-extension):/i.test(hostHeader)) {
      return true;
    }

    // use the node url-parser to retrieve the hostname from the host-header. 使用节点 url-parser 从主机头检索主机名
    const hostname = url.parse(
      // if hostHeader doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(hostHeader) ? hostHeader : `//${hostHeader}`,
      false,
      true
    ).hostname;

    // always allow requests with explicit IPv4 or IPv6-address. 总是允许带有Pv4或Pv6地址的请求。
    // A note on IPv6 addresses: 关于I Pv6地址的注释
    // hostHeader will always contain the brackets denoting host Header将总是包含在UR Ls中表示I Pv6地址的括号，
    // an IPv6-address in URLs, 这些在url.parse()中从主机名中删除，
    // these are removed from the hostname in url.parse(), 所以我们在hostname中有纯粹的I Pv6地址。
    // so we have the pure IPv6-address in hostname. 
    // always allow localhost host, for convenience (hostname === 'localhost')  总是允许localhost主机，为方便起见(hostname === 'localhost') 
    // allow hostname of listening address  (hostname === this.options.host) 允许监听地址的主机名(hostname == this.options.host)
    const isValidHostname =
      (hostname !== null && ipaddr.IPv4.isValid(hostname)) ||
      (hostname !== null && ipaddr.IPv6.isValid(hostname)) ||
      hostname === "localhost" ||
      hostname === this.options.host;

    if (isValidHostname) {
      return true;
    }

    const { allowedHosts } = this.options;

    // always allow localhost host, for convenience
    // allow if hostname is in allowedHosts
    if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
      for (let hostIdx = 0; hostIdx < allowedHosts.length; hostIdx++) {
        const allowedHost = allowedHosts[hostIdx];

        if (allowedHost === hostname) {
          return true;
        }

        // support "." as a subdomain wildcard
        // e.g. ".example.com" will allow "example.com", "www.example.com", "subdomain.example.com", etc
        if (allowedHost[0] === ".") {
          // "example.com"  (hostname === allowedHost.substring(1))
          // "*.example.com"  (hostname.endsWith(allowedHost))
          if (
            hostname === allowedHost.substring(1) ||
            /** @type {string} */ (hostname).endsWith(allowedHost)
          ) {
            return true;
          }
        }
      }
    }

    // Also allow if `client.webSocketURL.hostname` provided
    if (
      this.options.client &&
      typeof (
        /** @type {ClientConfiguration} */ (this.options.client).webSocketURL
      ) !== "undefined"
    ) {
      return (
        /** @type {WebSocketURL} */
        (/** @type {ClientConfiguration} */ (this.options.client).webSocketURL)
          .hostname === hostname
      );
    }

    // disallow
    return false;
  }

  /**
   * 通过 web-socket 发送消息
   * @param {ClientConnection[]} clients
   * @param {string} type
   * @param {any} [data]
   * @param {any} [params]
   */
  // eslint-disable-next-line class-methods-use-this
  sendMessage(clients, type, data, params) {
    for (const client of clients) {
      // `sockjs` uses `1` to indicate client is ready to accept data ' sockjs '使用' 1 '表示客户端准备接受数据
      // `ws` uses `WebSocket.OPEN`, but it is mean `1` too ' ws '使用' Web Socket '。OPEN '，但它的意思也是“1”
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type, data, params })); // 发送消息
      }
    }
  }

  /**
   * 实现 devServer.magicHtml 中间件： 告诉 dev-server 启用/禁用魔术 HTML 路由（与您的 webpack 输出相对应的路由，例如 main.js 的 /main）
   *  -> 1. 获取到请求路径拼接 .js，利用 this.middleware 判断一下这个文件是否存在
   *  -> 2. 文件存在则提供一个执行javascript的页面
   * @private
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @returns {void}
   */
  serveMagicHtml(req, res, next) {
    // 不是 GET 或 HEAD，直接放行
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
    // waitUntilValid：当编译器包有效时执行回调函数，通常是在编译之后。
    (this.middleware).waitUntilValid(() => {
      const _path = req.path; // 请求路径

      try {
        const filename =
          /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
          (this.middleware).getFilenameFromUrl(`${_path}.js`); // 组装 .js 拼接路径
        const isFile =
          /** @type {Compiler["outputFileSystem"] & { statSync: import("fs").StatSyncFn }}*/
          (
            /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
            (this.middleware).context.outputFileSystem
          )
            .statSync(/** @type {import("fs").PathLike} */ (filename))
            .isFile(); // 查找是否存在 `${_path}.js` 文件

        if (!isFile) {
          return next(); // 不存在直接放行，交由下一个中间件处理
        }

        // Serve a page that executes the javascript 提供一个执行javascript的页面
        // @ts-ignore
        const queries = req._parsedUrl.search || "";
        const responsePage = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script type="text/javascript" charset="utf-8" src="${_path}.js${queries}"></script></body></html>`;

        res.send(responsePage);
      } catch (error) {
        return next();
      }
    });
  }

  // Send stats to a socket or multiple sockets
  /**
   * @private
   * @param {ClientConnection[]} clients
   * @param {StatsCompilation} stats
   * @param {boolean} [force]
   */
  sendStats(clients, stats, force) {
    const shouldEmit =
      !force &&
      stats &&
      (!stats.errors || stats.errors.length === 0) &&
      (!stats.warnings || stats.warnings.length === 0) &&
      this.currentHash === stats.hash;

    if (shouldEmit) {
      this.sendMessage(clients, "still-ok");

      return;
    }

    // 当次编译 hash 值
    this.currentHash = stats.hash;
    this.sendMessage(clients, "hash", stats.hash);

    /**
     * 如果编译出现错误或警告，那么就将错误和警告信息发送给客户端
     *  1. 错误：{"type": "errors", "data": [{ loc: 错误位置(行:列), message: 错误信息, moduleName: 错误文件 }]}
     *  2. 警告：{ "type": "warnings", "data": 与错误类似 }
     * 如果没有错误或警告，发送一条 ok 消息
     *  { "type": "ok" }
     */
    if (
      /** @type {NonNullable<StatsCompilation["errors"]>} */
      (stats.errors).length > 0 ||
      /** @type {NonNullable<StatsCompilation["warnings"]>} */
      (stats.warnings).length > 0
    ) {
      const hasErrors =
        /** @type {NonNullable<StatsCompilation["errors"]>} */
        (stats.errors).length > 0;

      if (
        /** @type {NonNullable<StatsCompilation["warnings"]>} */
        (stats.warnings).length > 0
      ) {
        let params;

        if (hasErrors) {
          params = { preventReloading: true };
        }

        this.sendMessage(clients, "warnings", stats.warnings, params);
      }

      if (
        /** @type {NonNullable<StatsCompilation["errors"]>} */ (stats.errors)
          .length > 0
      ) {
        this.sendMessage(clients, "errors", stats.errors);
      }
    } else {
      this.sendMessage(clients, "ok");
    }
  }

  /**
   * @param {string | string[]} watchPath
   * @param {WatchOptions} [watchOptions]
   */
  watchFiles(watchPath, watchOptions) {
    const chokidar = require("chokidar"); // 通过 chokidar 库实现监听文件功能
    const watcher = chokidar.watch(watchPath, watchOptions);

    // disabling refreshing on changing the content 更改内容时禁用刷新
    if (this.options.liveReload) {
      watcher.on("change", (item) => {
        if (this.webSocketServer) {
          this.sendMessage(
            this.webSocketServer.clients,
            "static-changed",
            item
          );
        }
      });
    }

    this.staticWatchers.push(watcher); // 将监听该文件的监听器推入集合中
  }

  /**
   * 调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
   * @param {import("webpack-dev-middleware").Callback} [callback]
   */
  invalidate(callback = () => {}) {
    if (this.middleware) {
      this.middleware.invalidate(callback);
    }
  }

  /**
   * 启动方法：
   *  1. 规范化配置项(webpack.devServer)
   *  2. 提取出 host 和 端口号
   *  3. 初始化服务器相关：
   *      -> 实现客户端的 webSocket：借助 webpack.EntryPlugin 插件添加 entry 入口，这样在客户端中就会与本地 ws 服务器通信
   *      -> 实现客户端的 hot：添加 webpack/hot/only-dev-server(或 webpack/hot/dev-server，两者差异在构建失败时不刷新页面作为回退) 入口，以及添加一个 webpack.HotModuleReplacementPlugin 插件实现
   *      -> 初始化服务器相关：
   *            -> 注册 Compiler.hooks 两个事件，主要用于通过 ws 通知客户端构建信息
   *            -> 设置一个 express 实例：express() 即可
   *            -> 监听所有的请求，检测 host 请求头部字段是否在白名单中，详情见：devServer.allowedHosts
   *            -> 设置生成一个 webpack-dev-middeware 中间件，后续用于代理编译资源
   *            -> 设置 express 路由，处理几个内部请求：这几个要在 webpack-dev-middleware 代理资源之前，因为要先处理这几个请求
   *                -> 1. /__webpack_dev_server__/sockjs.bundle.js：直接读取出 ../client/modules/sockjs-client/index.js 文件响应
   *                -> 2. /webpack-dev-server/invalidate：调用 middleware.invalidate 方法，指示 webpack-dev-middleware 实例重新编译包
   *                -> 3. /webpack-dev-server：返回所有的编译文件列表给客户端
   *            -> 配置 globs/directories/files 来监听文件变化，文件发生变更时通知客户端刷新：详情见 devServer.watchFiles
   *            -> 处理 devServer.static.watch 选项：通过 static.directory 配置项告诉 dev-server 监听文件。默认启用，文件更改将触发整个页面重新加载。
   *                -> 上面两个配置主要是没有被 webpack 监听的其他文件，在 webpack-dev-server 这一层进行监听
   *            -> 配置 express 中间件，例如代理服务器、静态目录、webpack-dev-middeware 中间件代理编译资源等等，详情见 setupMiddlewares 方法
   *            -> 使用 Node 的 http(https、http2)模块创建本地服务器实例，但是在这里暂时不启动监听连接
   *  4. 连接服务器：this.server.listen()
   *  5. 创建本地 ws 服务器，并在与客户端连接时发送一些数据给客户端
   *  6. 通过 ZeroConf 网络广播你的开发服务器(如果配置了 devServer.bonjour)
   *  7. 进行信息输出
   * @returns {Promise<void>}
   */
  async start() {
    await this.normalizeOptions(); // 规范化配置项

    /**
     * options.ipc：要侦听的 Unix 套接字（而不是主机）
     * 将其设置为 true 将会监听 /your-os-temp-dir/webpack-dev-server.sock 的 socket
     */
    if (this.options.ipc) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve, reject) => {
          const net = require("net");
          const socket = new net.Socket();

          socket.on(
            "error",
            /**
             * @param {Error & { code?: string }} error
             */
            (error) => {
              if (error.code === "ECONNREFUSED") {
                // No other server listening on this socket so it can be safely removed
                fs.unlinkSync(/** @type {string} */ (this.options.ipc));

                resolve();

                return;
              } else if (error.code === "ENOENT") {
                resolve();

                return;
              }

              reject(error);
            }
          );

          socket.connect(
            { path: /** @type {string} */ (this.options.ipc) },
            () => {
              throw new Error(`IPC "${this.options.ipc}" is already used`);
            }
          );
        })
      );
    } else {
      // 提取出 host -- 详情可见：devServer.host
      this.options.host = await Server.getHostname(
        /** @type {Host} */ (this.options.host)
      );
      // 获取监听请求的端口号，如果设置为 auto，则自动使用一个可用端口
      this.options.port = await Server.getFreePort(
        /** @type {Port} */ (this.options.port),
        this.options.host
      );
    }

    // 初始化服务器相关，详情见方法注释
    await this.initialize();

    const listenOptions = this.options.ipc
      ? { path: this.options.ipc }
      : { host: this.options.host, port: this.options.port };

    // 启动监听连接的服务器。
    await /** @type {Promise<void>} */ (
      new Promise((resolve) => {
        /** @type {import("http").Server} */
        (this.server).listen(listenOptions, () => {
          resolve();
        });
      })
    );

    if (this.options.ipc) {
      // chmod 666 (rw rw rw)
      const READ_WRITE = 438;

      await fs.promises.chmod(
        /** @type {string} */ (this.options.ipc),
        READ_WRITE
      );
    }

    // 创建本地 ws 服务器，并在与客户端连接时发送一些数据给客户端
    if (this.options.webSocketServer) {
      this.createWebSocketServer();
    }

    // devServer.bonjour：这个配置用于在启动时通过 ZeroConf 网络广播你的开发服务器。
    if (this.options.bonjour) {
      this.runBonjour();
    }

    // 进行信息输出
    this.logStatus();

    // 提供在 webpack-dev-server 开始监听端口连接时执行自定义函数的能力。
    if (typeof this.options.onListening === "function") {
      this.options.onListening(this);
    }
  }

  /**
   * @param {(err?: Error) => void} [callback]
   */
  startCallback(callback = () => {}) {
    this.start()
      .then(() => callback(), callback)
      .catch(callback);
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.bonjour) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          this.stopBonjour(() => {
            resolve();
          });
        })
      );
    }

    this.webSocketProxies = [];

    await Promise.all(this.staticWatchers.map((watcher) => watcher.close()));

    this.staticWatchers = [];

    if (this.webSocketServer) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          /** @type {WebSocketServerImplementation} */
          (this.webSocketServer).implementation.close(() => {
            this.webSocketServer = null;

            resolve();
          });

          for (const client of /** @type {WebSocketServerImplementation} */ (
            this.webSocketServer
          ).clients) {
            client.terminate();
          }

          /** @type {WebSocketServerImplementation} */
          (this.webSocketServer).clients = [];
        })
      );
    }

    if (this.server) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          /** @type {import("http").Server} */
          (this.server).close(() => {
            this.server = null;

            resolve();
          });

          for (const socket of this.sockets) {
            socket.destroy();
          }

          this.sockets = [];
        })
      );

      if (this.middleware) {
        await /** @type {Promise<void>} */ (
          new Promise((resolve, reject) => {
            /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
            (this.middleware).close((error) => {
              if (error) {
                reject(error);

                return;
              }

              resolve();
            });
          })
        );

        this.middleware = null;
      }
    }

    // We add listeners to signals when creating a new Server instance
    // So ensure they are removed to prevent EventEmitter memory leak warnings
    for (const item of this.listeners) {
      process.removeListener(item.name, item.listener);
    }
  }

  /**
   * @param {(err?: Error) => void} [callback]
   */
  stopCallback(callback = () => {}) {
    this.stop()
      .then(() => callback(), callback)
      .catch(callback);
  }

  // TODO remove in the next major release
  /**
   * @param {Port} port
   * @param {Host} hostname
   * @param {(err?: Error) => void} fn
   * @returns {void}
   */
  listen(port, hostname, fn) {
    util.deprecate(
      () => {},
      "'listen' is deprecated. Please use the async 'start' or 'startCallback' method.",
      "DEP_WEBPACK_DEV_SERVER_LISTEN"
    )();

    if (typeof port === "function") {
      fn = port;
    }

    if (
      typeof port !== "undefined" &&
      typeof this.options.port !== "undefined" &&
      port !== this.options.port
    ) {
      this.options.port = port;

      this.logger.warn(
        'The "port" specified in options is different from the port passed as an argument. Will be used from arguments.'
      );
    }

    if (!this.options.port) {
      this.options.port = port;
    }

    if (
      typeof hostname !== "undefined" &&
      typeof this.options.host !== "undefined" &&
      hostname !== this.options.host
    ) {
      this.options.host = hostname;

      this.logger.warn(
        'The "host" specified in options is different from the host passed as an argument. Will be used from arguments.'
      );
    }

    if (!this.options.host) {
      this.options.host = hostname;
    }

    this.start()
      .then(() => {
        if (fn) {
          fn.call(this.server);
        }
      })
      .catch((error) => {
        // Nothing
        if (fn) {
          fn.call(this.server, error);
        }
      });
  }

  /**
   * @param {(err?: Error) => void} [callback]
   * @returns {void}
   */
  // TODO remove in the next major release
  close(callback) {
    util.deprecate(
      () => {},
      "'close' is deprecated. Please use the async 'stop' or 'stopCallback' method.",
      "DEP_WEBPACK_DEV_SERVER_CLOSE"
    )();

    this.stop()
      .then(() => {
        if (callback) {
          callback();
        }
      })
      .catch((error) => {
        if (callback) {
          callback(error);
        }
      });
  }
}

module.exports = Server;
