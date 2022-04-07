/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const util = require('util');
const webpackOptionsSchemaCheck = require('../schemas/WebpackOptions.check.js');
const webpackOptionsSchema = require('../schemas/WebpackOptions.json');
const Compiler = require('./Compiler');
const MultiCompiler = require('./MultiCompiler');
const WebpackOptionsApply = require('./WebpackOptionsApply');
const {
  applyWebpackOptionsDefaults,
  applyWebpackOptionsBaseDefaults,
} = require('./config/defaults');
const { getNormalizedWebpackOptions } = require('./config/normalization');
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin');
const memoize = require('./util/memoize');

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("./Compiler").WatchOptions} WatchOptions */
/** @typedef {import("./MultiCompiler").MultiCompilerOptions} MultiCompilerOptions */
/** @typedef {import("./MultiStats")} MultiStats */
/** @typedef {import("./Stats")} Stats */

const getValidateSchema = memoize(() => require('./validateSchema'));

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} stats
 * @returns {void}
 */

/**
 * @param {ReadonlyArray<WebpackOptions>} childOptions options array
 * @param {MultiCompilerOptions} options options
 * @returns {MultiCompiler} a multi-compiler
 */
const createMultiCompiler = (childOptions, options) => {
  const compilers = childOptions.map((options) => createCompiler(options));
  const compiler = new MultiCompiler(compilers, options);
  for (const childCompiler of compilers) {
    if (childCompiler.options.dependencies) {
      compiler.setDependencies(
        childCompiler,
        childCompiler.options.dependencies
      );
    }
  }
  return compiler;
};

/**
 * 主要做了如下工作：
 *  1. 标准化配置项并添加默认值
 *  2. 实例化 Compiler
 *  3. 注册用户定义的插件
 *  4. 注册 webpack 内部插件
 *  5. 返回 Compiler 实例
 * @param {WebpackOptions} rawOptions options object 原始配置项(即用户定义的配置项)
 * @returns {Compiler} a compiler 
 */
const createCompiler = (rawOptions) => {
  // 将配置项标准化
  const options = getNormalizedWebpackOptions(rawOptions);
  /**
   * 添加 webpack 配置项的基础默认值：context(上下文)、infrastructureLogging(应该是用来做日志输出的)，应该是这些配置可以传递给用户定义的插件？
   */
  applyWebpackOptionsBaseDefaults(options);
  // 初始化 Compiler - 配置了初始属性，并没有做实际操作
  const compiler = new Compiler(options.context, options);

  // 初始化 Node 环境的插件
  new NodeEnvironmentPlugin({
    infrastructureLogging: options.infrastructureLogging,
  }).apply(compiler);

  // 注册用户定义的插件
  if (Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      if (typeof plugin === 'function') {
        plugin.call(compiler, compiler);
      } else {
        plugin.apply(compiler);
      }
    }
  }
  // 在这里，就是给各项配置添加默认值
  applyWebpackOptionsDefaults(options);
  /**
   * environment 钩子：在编译器准备环境时调用，时机就在配置文件中初始化插件之后。
   * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
   */
  compiler.hooks.environment.call();
  /**
   * afterEnvironment 钩子：当编译器环境设置完成后，在 environment hook 后直接调用。
   * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
   */
  compiler.hooks.afterEnvironment.call();
  // 根据配置项注册 webpack 内部插件
  /**
   * 主要做了如下工作：
   * 1. 根据配置项注册内部插件
   * 2. 执行 Compiler.hooks.entryOption 钩子
   *      内部插件注册了这个钩子，用于处理 entry
   * 3. 执行 Compiler.hooks.afterPlugins 钩子
   * 4. 执行 Compiler.hooks.afterResolvers 钩子
   */
  new WebpackOptionsApply().process(options, compiler);
  /**
  * initialize 钩子：当编译器对象被初始化时调用。
  * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
  */
  compiler.hooks.initialize.call();
  return compiler;
};

/**
 * @callback WebpackFunctionSingle
 * @param {WebpackOptions} options options object
 * @param {Callback<Stats>=} callback callback
 * @returns {Compiler} the compiler object
 */

/**
 * 转化为数组
 * @callback WebpackFunctionMulti
 * @param {ReadonlyArray<WebpackOptions> & MultiCompilerOptions} options options objects
 * @param {Callback<MultiStats>=} callback callback
 * @returns {MultiCompiler} the multi compiler object 多编译器对象
 */

const asArray = (options) =>
  // 数组 ？ 复制一份 : 转为数组
  Array.isArray(options) ? Array.from(options) : [options];

const webpack /** @type {WebpackFunctionSingle & WebpackFunctionMulti} */ =
  /**
   * @param {WebpackOptions | (ReadonlyArray<WebpackOptions> & MultiCompilerOptions)} options options 配置项 - 这个配置项还会经过 webpack-cli 处理一层，但是增加东西很少
   * @param {Callback<Stats> & Callback<MultiStats>=} callback callback
   * @returns {Compiler | MultiCompiler}
   */
  (options, callback) => {
    const create = () => {
      // 检测 webpack 的配置项是否符合规范，options 可能是导出多个配置，所以是数组
      // 检测不通过会抛出警告，但是会继续编译
      if (!asArray(options).every(webpackOptionsSchemaCheck)) {
        getValidateSchema()(webpackOptionsSchema, options);
        // http://nodejs.cn/api/util.html#utildeprecatefn-msg-code -- 以标记为已弃用的方式封装 fn（可能是函数或类）。
        // 简单将，就是包装一个空函数标记为废弃函数，直接执行后，警告将触发并打印到 stderr。
        util.deprecate(
          () => {},
          'webpack bug: Pre-compiled schema reports error while real schema is happy. This has performance drawbacks.', // webpack 错误：预编译模式报告错误，而实际模式正常。这有性能缺陷
          'DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID' // 弃用代码
        )();
      }
      /** @type {MultiCompiler|Compiler} */
      let compiler; // 如果是多个配置，则是 MultiCompiler
      let watch = false; // 是否启动了 watch 选项，监听文件变化，当它们修改后会重新编译
      /** @type {WatchOptions|WatchOptions[]} */
      let watchOptions;
      if (Array.isArray(options) /** 多个配置时 */) {
        /** @type {MultiCompiler} */
        compiler = createMultiCompiler(
          options,
          /** @type {MultiCompilerOptions} */ (options)
        );
        watch = options.some((options) => options.watch);
        watchOptions = options.map((options) => options.watchOptions || {});
      } else {
        const webpackOptions = /** @type {WebpackOptions} */ (options);
        /** @type {Compiler} */
        compiler = createCompiler(webpackOptions); // 初始化 Compiler，并完成其他工作，见方法注释
        watch = webpackOptions.watch; // 是否监听文件变化
        watchOptions = webpackOptions.watchOptions || {};
      }
      return { compiler, watch, watchOptions }; // 返回
    };
    // 从代码上看，如果存在 callback 的话，还会驱动 compiler 进行编译
    //            否则的话，直接创建一下 compiler 返回，这时可以自行编译流程
    if (callback) {
      try {
        const { compiler, watch, watchOptions } = create();
        // 如果需要对文件改动监听的话
        if (watch) {
          compiler.watch(watchOptions, callback);
        } else {
          // 通过 compiler.run 启动构建
          compiler.run((err, stats) => {
            compiler.close((err2) => {
              callback(err || err2, stats);
            });
          });
        }
        return compiler;
      } catch (err) {
        // 执行过程出错的话，抛出错误
        process.nextTick(() => callback(err));
        return null;
      }
    } else {
      const { compiler, watch } = create();
      if (watch) {
        util.deprecate(
          () => { }, 
          // 设置“watch”选项时，需要向“webpack（options，callback）”函数提供“callback”参数。没有回调就无法处理“watch”选项
          "A 'callback' argument needs to be provided to the 'webpack(options, callback)' function when the 'watch' option is set. There is no way to handle the 'watch' option without a callback.",
          'DEP_WEBPACK_WATCH_WITHOUT_CALLBACK'
        )();
      }
      return compiler;
    }
  };

module.exports = webpack;
