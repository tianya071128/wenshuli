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
 * @param {WebpackOptions} rawOptions options object
 * @returns {Compiler} a compiler
 */
const createCompiler = (rawOptions) => {
  const options = getNormalizedWebpackOptions(rawOptions); // 获取规范化后的配置项
  /**
   * 添加 webpack 配置项的基础默认值：context、infrastructureLogging，应该是这些配置可以传递给用户定义的插件？
   */
  applyWebpackOptionsBaseDefaults(options);
  // 初始化
  const compiler = new Compiler(options.context, options);
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
  // environment 钩子：在编译器准备环境时调用，时机就在配置文件中初始化插件之后。
  compiler.hooks.environment.call();
  // afterEnvironment：当编译器环境设置完成后，在 environment hook 后直接调用。
  compiler.hooks.afterEnvironment.call();
  // 注册 webpack 内部插件
  new WebpackOptionsApply().process(options, compiler);
  // 执行 initialize 钩子
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
 * @callback WebpackFunctionMulti
 * @param {ReadonlyArray<WebpackOptions> & MultiCompilerOptions} options options objects
 * @param {Callback<MultiStats>=} callback callback
 * @returns {MultiCompiler} the multi compiler object
 */

const asArray = (options) =>
  Array.isArray(options) ? Array.from(options) : [options];

const webpack /** @type {WebpackFunctionSingle & WebpackFunctionMulti} */ =
  /**
   * @param {WebpackOptions | (ReadonlyArray<WebpackOptions> & MultiCompilerOptions)} options options
   * @param {Callback<Stats> & Callback<MultiStats>=} callback callback
   * @returns {Compiler | MultiCompiler}
   */
  (options, callback) => {
    const create = () => {
      if (!asArray(options).every(webpackOptionsSchemaCheck)) {
        getValidateSchema()(webpackOptionsSchema, options);
        util.deprecate(
          () => {},
          'webpack bug: Pre-compiled schema reports error while real schema is happy. This has performance drawbacks.',
          'DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID'
        )();
      }
      /** @type {MultiCompiler|Compiler} */
      let compiler;
      let watch = false;
      /** @type {WatchOptions|WatchOptions[]} */
      let watchOptions;
      if (Array.isArray(options)) {
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
        compiler = createCompiler(webpackOptions);
        watch = webpackOptions.watch;
        watchOptions = webpackOptions.watchOptions || {};
      }
      return { compiler, watch, watchOptions };
    };
    if (callback) {
      try {
        const { compiler, watch, watchOptions } = create();
        if (watch) {
          compiler.watch(watchOptions, callback);
        } else {
          compiler.run((err, stats) => {
            compiler.close((err2) => {
              callback(err || err2, stats);
            });
          });
        }
        return compiler;
      } catch (err) {
        process.nextTick(() => callback(err));
        return null;
      }
    } else {
      const { compiler, watch } = create();
      if (watch) {
        util.deprecate(
          () => {},
          "A 'callback' argument needs to be provided to the 'webpack(options, callback)' function when the 'watch' option is set. There is no way to handle the 'watch' option without a callback.",
          'DEP_WEBPACK_WATCH_WITHOUT_CALLBACK'
        )();
      }
      return compiler;
    }
  };

module.exports = webpack;
