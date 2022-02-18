"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getOptions;

var _loaderUtils = _interopRequireDefault(require("loader-utils"));

var _schemaUtils = _interopRequireDefault(require("schema-utils"));

var _options = _interopRequireDefault(require("./options.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * 
 * @param {Object} loaderContext loader 执行上下文
 * @returns 
 */
function getOptions(loaderContext) {
  const options = {
    eslintPath: 'eslint', // 格式化程序 - 默认为 eslint，还可以指定其他的程序：https://v4.webpack.docschina.org/loaders/eslint-loader/#eslintpath-default-eslint-
    ..._loaderUtils.default.getOptions(loaderContext) // 提取出配置项
  };
  // 验证配置项
  (0, _schemaUtils.default)(_options.default, options, {
    name: 'ESLint Loader',
    baseDataPath: 'options'
  });

  const {
    CLIEngine // 格式化程序 - 默认为 eslint
  } = require(options.eslintPath); // 加载格式化程序

  // options.formatter：格式化器 - 决定 ESLint 输出消息的格式 -- https://eslint.bootcss.com/docs/developer-guide/working-with-custom-formatters
  options.formatter = getFormatter(CLIEngine, options.formatter);

  /**
   * options.outputReport：将错误的输出写入文件 -- e.g：{filePath: "checkstyle.xml", formatter: require("eslint/lib/formatters/checkstyle")}
   */
  if (options.outputReport && options.outputReport.formatter) {
    // 将错误写入文件时的格式化器
    options.outputReport.formatter = getFormatter(CLIEngine, options.outputReport.formatter);
  }

  return options;
}

/**
 * 获取格式化器，如果用户没有指定，则取默认格式化器 stylish
 * @param {Function} CLIEngine ESlint 程序
 * @param {Function | String} formatter 用户自定义格式化器
 * @returns 格式化器
 */
function getFormatter(CLIEngine, formatter) {
  // 如果自定义的为函数，则直接使用
  if (typeof formatter === 'function') {
    return formatter;
  } // Try to get oficial formatter 试着找到官方的格式化程序


  // 自定义的为字符串，表示从 ESlint 官方格式化器中取
  if (typeof formatter === 'string') {
    try {
      return CLIEngine.getFormatter(formatter);
    } catch (e) {// ignored
    }
  }

  // 否则取默认格式化器 stylish
  return CLIEngine.getFormatter('stylish');
}