"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeFallback;

var _loaderUtils = _interopRequireDefault(require("loader-utils"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * 提取出后备加载器和传递给后备加载器的配置项
 * @param {String?} fallback 后备加载器 -- 将接收与 url-loader 相同的配置选项。
 * @param {Object} originalOptions 定义 url-loader 时的配置项
 * @returns {{loader: String, options: Object}} 返回加载出的 loader(后备加载器) 和 options(loader 配置项)
 */
function normalizeFallback(fallback, originalOptions) {
  let loader = 'file-loader'; // 默认后备加载器为 file-loader
  let options = {};

  // 如果用户自定义了 fallback 后备加载器的话
  if (typeof fallback === 'string') {
    loader = fallback; // 使用用户定义的后备加载器
    const index = fallback.indexOf('?');

    // 如果用户使用 'file-loader?xxx=xxx...' 方式传递 option 给后备加载器的话，将 query 参数提取出来
    if (index >= 0) {
      loader = fallback.substr(0, index); // 提取出后备加载器名称
      options = _loaderUtils.default.parseQuery(fallback.substr(index)); // 解析 query 参数
    }
  }

  // 如果定义的 fallback 是对象形式，那么从对象中提取出 loader 和 options
  if (fallback !== null && typeof fallback === 'object') {
    ({
      loader,
      options
    } = fallback);
  }

  // 将定义 url-loader 时的配置项和传递给后备加载器的配置项进行合并
  options = Object.assign({}, originalOptions, options);
  delete options.fallback;
  // 返回加载出的 loader(后备加载器) 和 options(loader 配置项)
  return {
    loader,
    options
  };
}