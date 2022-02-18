"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createEngine;

var _objectHash = _interopRequireDefault(require("object-hash")); // 从对象和值生成 hash

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const engines = {}; // 闭包缓存

// 创建 ESLint 引擎: { CLIEngine: linting 程序 - 默认为 eslint, engine: 格式化程序实例(根据 options 创建) }
function createEngine(options) {
  /**
   * options.eslintPath(默认 eslint)： eslint将用于 linting 的实例的路径。如果 eslintPath 是官方 eslint 之类的文件夹，或者指定一个formatter选项。现在您不必安装eslint
   */
  const {
    CLIEngine // linting 程序 - 默认为 eslint
  } = require(options.eslintPath);

  const hash = (0, _objectHash.default)(options); // 从对象和值生成生成 hash，用于标识这个 options

  // 不存在缓存的话
  if (!engines[hash]) { 
    engines[hash] = new CLIEngine(options); // 根据这个 options 生成一个 linting 程序实例
  }

  return {
    CLIEngine, // linting 程序 - 默认为 eslint
    engine: engines[hash] // linting 程序实例
  };
}