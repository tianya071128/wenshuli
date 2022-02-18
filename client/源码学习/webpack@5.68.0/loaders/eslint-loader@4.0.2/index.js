"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;

var _getOptions = _interopRequireDefault(require("./getOptions"));

var _Linter = _interopRequireDefault(require("./Linter")); 

var _cacheLoader = _interopRequireDefault(require("./cacheLoader"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// loader noraml 阶段执行方法
function loader(content, map) {
  const options = (0, _getOptions.default)(this); // 处理好了相关配置项
  const linter = new _Linter.default(this, options); // 创建
  // 在这里设置的缓存是 webpack 的 loader 结果缓存
  this.cacheable(); // 设置是否可缓存标志的函数，但是这里没有传入 false(所以应该是可缓存的标识) -- https://webpack.docschina.org/api/loaders/#thiscacheable

  // return early if cached 如果缓存了，请提前返回
  if (options.cache /** 此选项将启用将 linting 结果缓存到文件中 */) {
    // 这里缓存的是持久性缓存，所以会根据源码、eslint 版本好、linting 程序版本、eslint-loader 配置项作为 标识符 来进行缓存，写入文件系统的缓存
    (0, _cacheLoader.default)(linter, content, map); 
    return;
  }

  /**
   * 不进行写入文件缓存结果的话，那么我们只要调用 lint 方法检查代码检查、调用 printOutput 方法输出检查结果
   * 与写入文件缓存相比，只是少了一步进行文件缓存的过程
   */
  linter.printOutput(linter.lint(content));
  this.callback(null, content, map);
}