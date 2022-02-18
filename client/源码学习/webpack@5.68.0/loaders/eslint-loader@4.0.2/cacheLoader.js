"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cacheLoader;

var _package = require("../package.json");

var _cache = _interopRequireDefault(require("./cache"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// 缓存 eslint-loader 代码检查结果，在这里 缓存标识 是通过 源码、cacheIdentifier(eslint-loader 版本、linting 程序版本)、eslint-loader 配置项 综合得到的 key
// 这样，只要源码、版本、配置项不同，就不会使用缓存结果
function cacheLoader(linter, content, map) {
  const {
    loaderContext, // loader 执行上下文
    options, // loader 配置项
    CLIEngine // 格式化程序
  } = linter;
  const callback = loaderContext.async(); // 告诉 loader-runner 这个 loader 将会异步地回调。
  const cacheIdentifier = JSON.stringify({
    'eslint-loader': _package.version, // eslint-loader 版本
    eslint: CLIEngine.version // linting 程序版本 - 一般为 eslint
  });
  (0, _cache.default)({
    cacheDirectory: options.cache, // 缓存目录，如果 options.cache 没有指定，则默认为 ./node_modules/.cache
    cacheIdentifier, // 缓存 eslint-loader 和 linting 版本信息 -- 用于缓存标识符
    cacheCompression: true,
    options, // loader 配置项
    source: content, // 资源源码
    // 进行代码检查，输出检查结果
    transform() {
      return linter.lint(content);
    }
  }).then(res => {
    // 已经进行代码检查转化，并且将其结果写入缓存了
    // 接下来使用 printOutput 处理一下检查结果(检查是否修复错误(options.fix)、是否将检查结果输出到文件(options.outputReport)、以及如何输出结果)
    try {
      linter.printOutput({ ...res,
        src: content // 资源源码
      });
    } catch (error) {
      return callback(error, content, map);
    }

    return callback(null, content, map); // 返回结果给 webpack
  }).catch(err => {
    // istanbul ignore next
    return callback(err);
  });
}