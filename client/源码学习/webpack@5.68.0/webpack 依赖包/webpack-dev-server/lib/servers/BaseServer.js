"use strict";

/** @typedef {import("../Server").ClientConnection} ClientConnection */

// base class that users should extend if they are making their own
// server implementation
module.exports = class BaseServer {
  /**
   * @param {import("../Server")} server
   */
  constructor(server) {
    /** @type {import("../Server")} */
    this.server = server; // 本地 http 服务器

    /** @type {ClientConnection[]} */
    this.clients = []; // 与 web-socket 服务器建立连接的客户端集合
  }
};
