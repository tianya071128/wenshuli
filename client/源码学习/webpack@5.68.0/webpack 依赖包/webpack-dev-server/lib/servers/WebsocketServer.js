"use strict";

const WebSocket = require("ws");
const BaseServer = require("./BaseServer");

/** @typedef {import("../Server").WebSocketServerConfiguration} WebSocketServerConfiguration */
/** @typedef {import("../Server").ClientConnection} ClientConnection */
// ws 服务器类
module.exports = class WebsocketServer extends BaseServer {
  static heartbeatInterval = 1000;

  /**
   * @param {import("../Server")} server
   */
  constructor(server) {
    super(server); // 父类(BaseServer)构造一下

    // 这个配置项是 devServer.webSocketServer.options 配置项，用于配置 ws 服务器的配置项
    /** @type {import("ws").ServerOptions} */
    const options = {
      .../** @type {WebSocketServerConfiguration} */
      (this.server.options.webSocketServer).options,
      clientTracking: false,
    };
    // 没有配置 ws 服务器的 port、server 配置项
    const isNoServerMode =
      typeof options.port === "undefined" &&
      typeof options.server === "undefined";

    if (isNoServerMode) {
      options.noServer = true;
    }

    // 创建一个 ws 服务器，基于 ws 库
    this.implementation = new WebSocket.Server(options);

    /**
     * 监听本地 http 服务器的 upgrade 事件 -- upgrade 每次服务器响应升级请求时触发。
     *  在客户端通过 http 协议来请求升级 ws 协议时进行处理
     */
    /** @type {import("http").Server} */
    (this.server.server).on(
      "upgrade",
      /**
       * @param {import("http").IncomingMessage} req
       * @param {import("stream").Duplex} sock
       * @param {Buffer} head
       */
      (req, sock, head) => {
        // 查看给定的请求是否应由该服务器处理。默认情况下，此方法验证请求的路径名，将其与路径选项（如果提供）进行匹配。返回值，真或假，决定是否接受握手。
        if (!this.implementation.shouldHandle(req)) {
          return;
        }

        // 处理 HTTP 协议升级请求。
        this.implementation.handleUpgrade(req, sock, head, (connection) => {
          // 发出一个握手完成的事件(此时已借助 http 协议升级为 ws 协议并握手完成)
          this.implementation.emit("connection", connection, req);
        });
      }
    );

    // 当底层服务器发生错误时触发。
    this.implementation.on(
      "error",
      /**
       * @param {Error} err
       */
      (err) => {
        // 打印错误
        this.server.logger.error(err.message);
      }
    );

    const interval = setInterval(() => {
      this.clients.forEach(
        /**
         * @param {ClientConnection} client
         */
        (client) => {
          if (client.isAlive === false) {
            client.terminate();

            return;
          }

          client.isAlive = false;
          client.ping(() => {});
        }
      );
    }, WebsocketServer.heartbeatInterval);

    // 握手完成时触发
    this.implementation.on(
      "connection",
      /**
       * @param {ClientConnection} client
       */
      (client) => {
        this.clients.push(client); // 建立连接的客户端集合

        client.isAlive = true; // 标识这个客户端是活跃的

        // 从服务器接收到 pong 时
        client.on("pong", () => {
          client.isAlive = true;
        });

        // 客户端启动关闭连接
        client.on("close", () => {
          this.clients.splice(this.clients.indexOf(client), 1);
        });
      }
    );

    // ws 服务器关闭
    this.implementation.on("close", () => {
      clearInterval(interval);
    });
  }
};
