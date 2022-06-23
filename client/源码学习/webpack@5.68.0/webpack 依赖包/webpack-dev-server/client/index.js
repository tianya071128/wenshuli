/* global __resourceQuery, __webpack_hash__ */
/// <reference types="webpack/module" />
import webpackHotLog from "webpack/hot/log.js";
import stripAnsi from "./utils/stripAnsi.js";
import parseURL from "./utils/parseURL.js";
import socket from "./socket.js";
import { formatProblem, show, hide } from "./overlay.js";
import { log, setLogLevel } from "./utils/log.js";
import sendMessage from "./utils/sendMessage.js";
import reloadApp from "./utils/reloadApp.js";
import createSocketURL from "./utils/createSocketURL.js";
/**
 * @typedef {Object} Options
 * @property {boolean} hot
 * @property {boolean} liveReload
 * @property {boolean} progress
 * @property {boolean | { warnings?: boolean, errors?: boolean, trustedTypesPolicyName?: string }} overlay
 * @property {string} [logging]
 * @property {number} [reconnect]
 */

/**
 * @typedef {Object} Status
 * @property {boolean} isUnloading
 * @property {string} currentHash
 * @property {string} [previousHash]
 */

/**
 * @type {Status}
 */

var status = {
  isUnloading: false,
  // TODO Workaround for webpack v4, `__webpack_hash__` is not replaced without HotModuleReplacement webpack v4的解决方案，没有热模块替换，' webpack hash '不会被替换
  // eslint-disable-next-line camelcase
  currentHash: typeof __webpack_hash__ !== "undefined" ? __webpack_hash__ : ""
};
/** @type {Options} */

var options = {
  hot: false,
  liveReload: false,
  progress: false,
  overlay: false
};
// __resourceQuery：webpack 解析模块时，模块路径 ？ 后携带的参数，例如：`${require.resolve("../client/index.js")}?${webSocketURLStr}`
// parsedResourceQuery：这个表明了，客户端需要连接的 ws 以及支持的其他功能
/** 例如
 * {
 *   "protocol": "ws:",
 *   "hostname": "0.0.0.0",
 *   "port": "8081",
 *   "pathname": "/ws",
 *   "logging": "info",
 *   "reconnect": "10"
 * }
 */
var parsedResourceQuery = parseURL(__resourceQuery);

if (parsedResourceQuery.hot === "true") {
  options.hot = true;
  log.info("Hot Module Replacement enabled.");
}

if (parsedResourceQuery["live-reload"] === "true") {
  options.liveReload = true;
  log.info("Live Reloading enabled.");
}

if (parsedResourceQuery.logging) {
  options.logging = parsedResourceQuery.logging;
}

if (typeof parsedResourceQuery.reconnect !== "undefined") {
  options.reconnect = Number(parsedResourceQuery.reconnect);
}
/**
 * @param {string} level
 */


function setAllLogLevel(level) {
  // This is needed because the HMR logger operate separately from dev server logger
  webpackHotLog.setLogLevel(level === "verbose" || level === "log" ? "info" : level);
  setLogLevel(level);
}

if (options.logging) {
  setAllLogLevel(options.logging);
}

self.addEventListener("beforeunload", function () {
  status.isUnloading = true;
});
// 客户端针对本地 ws 服务器发送消息的策略
var onSocketMessage = {
  // 开始通信时接收的消息，表示支持 hot 功能
  hot: function hot() {
    // 如果不支持 hot 功能，直接返回
    if (parsedResourceQuery.hot === "false") {
      return;
    }

    options.hot = true; // 标识一下支持 hot 功能
    log.info("Hot Module Replacement enabled."); // 打印内容：Hot Module Replacement enabled.
  },
  // 开始通信时接收的消息，表示支持 liveReload 功能 -- devServer.liveReload
  liveReload: function liveReload() {
    if (parsedResourceQuery["live-reload"] === "false") {
      return;
    }

    options.liveReload = true; // 标识支持 liveReload 功能
    log.info("Live Reloading enabled."); 
  },
  // 文件开始发生变化时接收的消息，表示需要重新构建
  invalid: function invalid() {
    log.info("App updated. Recompiling..."); // Fixes #1042. overlay doesn't clear if errors are fixed but warnings remain. 修复# 1042。Overlay并不清楚错误是否已经修复，但警告仍然存在

    // 在开始编译的时候，如果上一次编译存在错误或警告，那么先消失
    if (options.overlay) {
      hide();
    }

    sendMessage("Invalid"); //？？？
  },

  /**
   * @param {string} hash
   */
  // 每次构建完成后接收的消息，hash 表示当次构建的 hash 值
  hash: function hash(_hash) {
    status.previousHash = status.currentHash; // 上次构建的 hash 值
    status.currentHash = _hash; // 当次构建的 hash 值
  },
  logging: setAllLogLevel,

  /**
   * @param {boolean} value
   */
  // 初次通信时接收的消息，表示需要 overlay 功能：devServer.client.overlay
  overlay: function overlay(value) {
    // 是否在浏览器环境下
    if (typeof document === "undefined") {
      return;
    }

    options.overlay = value; // overlay 标识 - 表示支持的 overlay 类型：可以设置显示警告和错误类别
  },

  /**
   * @param {number} value
   */
  // 初次通信时接收的消息，表示连接 ws 服务器的重连次数：devServer.client.reconnect
  reconnect: function reconnect(value) {
    if (parsedResourceQuery.reconnect === "false") {
      return;
    }

    options.reconnect = value; // 重连次数
  },

  /**
   * @param {boolean} value
   */
  // 初次通信时接收的消息，表示是否在浏览器控制台上显示编译进度：devServer.client.progress
  progress: function progress(value) {
    options.progress = value;
  },

  /**
   * @param {{ pluginName?: string, percent: number, msg: string }} data
   */
  // 编译过程中接收的消息，表示编译的进度，用于在浏览器控制台上显示编译进度
  "progress-update": function progressUpdate(data) {
    if (options.progress) {
      // 打印编译进度
      log.info("".concat(data.pluginName ? "[".concat(data.pluginName, "] ") : "").concat(data.percent, "% - ").concat(data.msg, "."));
    }

    sendMessage("Progress", data);
  },
  // 当重新编译但是没有什么变化的时候接收到的消息
  "still-ok": function stillOk() {
    log.info("Nothing changed."); // 并没有什么改变

    if (options.overlay) {
      hide();
    }

    sendMessage("StillOk");
  },
  // 编译完成(初次编译或重新编译)时接收的消息，此时可能会实施 hot 或刷新页面
  ok: function ok() {
    sendMessage("Ok");

    // // 重新编译后将错误或警告遮罩消息
    if (options.overlay) {
      hide();
    }

    reloadApp(options, status); // 交由 reloadApp 处理当次逻辑
  },
  // TODO: remove in v5 in favor of 'static-changed'

  /**
   * @param {string} file
   */
  // 
  "content-changed": function contentChanged(file) {
    log.info("".concat(file ? "\"".concat(file, "\"") : "Content", " from static directory was changed. Reloading..."));
    self.location.reload();
  },

  /**
   * @param {string} file
   */
  // 静态目录发生变化了，详见 devServer.static.watch
  "static-changed": function staticChanged(file) {
    log.info("".concat(file ? "\"".concat(file, "\"") : "Content", " from static directory was changed. Reloading...")); // 从静态目录更改。重新加载…
    // 直接刷新页面，静态目录发生变化，是不会触发编译的，这个静态目录是直接通过 express.static 代理的，刷新页面重新请求一下文件即可
    self.location.reload();
  },

  /**
   * @param {Error[]} warnings
   * @param {any} params
   */
  warnings: function warnings(_warnings, params) {
    log.warn("Warnings while compiling.");

    var printableWarnings = _warnings.map(function (error) {
      var _formatProblem = formatProblem("warning", error),
          header = _formatProblem.header,
          body = _formatProblem.body;

      return "".concat(header, "\n").concat(stripAnsi(body));
    });

    sendMessage("Warnings", printableWarnings);

    for (var i = 0; i < printableWarnings.length; i++) {
      log.warn(printableWarnings[i]);
    }

    var needShowOverlayForWarnings = typeof options.overlay === "boolean" ? options.overlay : options.overlay && options.overlay.warnings;

    if (needShowOverlayForWarnings) {
      var trustedTypesPolicyName = typeof options.overlay === "object" && options.overlay.trustedTypesPolicyName;
      show("warning", _warnings, trustedTypesPolicyName || null);
    }

    if (params && params.preventReloading) {
      return;
    }

    reloadApp(options, status);
  },

  /**
   * @param {Error[]} errors
   */
  errors: function errors(_errors) {
    log.error("Errors while compiling. Reload prevented.");

    var printableErrors = _errors.map(function (error) {
      var _formatProblem2 = formatProblem("error", error),
          header = _formatProblem2.header,
          body = _formatProblem2.body;

      return "".concat(header, "\n").concat(stripAnsi(body));
    });

    sendMessage("Errors", printableErrors);

    for (var i = 0; i < printableErrors.length; i++) {
      log.error(printableErrors[i]);
    }

    var needShowOverlayForErrors = typeof options.overlay === "boolean" ? options.overlay : options.overlay && options.overlay.errors;

    if (needShowOverlayForErrors) {
      var trustedTypesPolicyName = typeof options.overlay === "object" && options.overlay.trustedTypesPolicyName;
      show("error", _errors, trustedTypesPolicyName || null);
    }
  },

  /**
   * @param {Error} error
   */
  error: function error(_error) {
    log.error(_error);
  },
  close: function close() {
    log.info("Disconnected!");

    if (options.overlay) {
      hide();
    }

    sendMessage("Close");
  }
};
var socketURL = createSocketURL(parsedResourceQuery);
socket(socketURL, onSocketMessage, options.reconnect);