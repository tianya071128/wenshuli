/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const EntryDependency = require('./dependencies/EntryDependency');

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

class EntryPlugin {
  /**
   * An entry plugin which will handle 一个可以处理
   * creation of the EntryDependency 创建 EntryDependency
   *
   * @param {string} context context path
   * @param {string} entry entry path
   * @param {EntryOptions | string=} options entry options (passing a string is deprecated)
   */
  constructor(context, entry, options) {
    this.context = context; // 上下文路径 -- webpack.options.context 配置
    this.entry = entry; // 入口路径(用户定义在 entry 选项的路径)
    this.options = options || ''; // entry 配置项
  }

  /**
   * Apply the plugin 注册插件
   * @param {Compiler} compiler the compiler instance 实例化的 compiler
   * @returns {void}
   */
  apply(compiler) {
    // 注册 compilation 钩子：compilation 创建之后执行。
    compiler.hooks.compilation.tap(
      'EntryPlugin',
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          EntryDependency,
          normalModuleFactory
        );
      }
    );

    const { entry, options, context } = this;
    // webpack 会将每个模块都视为一个不同的依赖，在这里就是创建一个入口依赖
    const dep = EntryPlugin.createDependency(entry, options);

    // 注册 make 钩子：compilation 结束之前执行。这个钩子 不会 被复制到子编译器。
    // 在这里钩子中，就会执行 addEntry 方法启动入口模块的构建，并递归构建依赖图
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      // addEntry：为编译添加入口
      compilation.addEntry(
        context, // 入口的上下文路径。
        dep, // 入口依赖 - 包含着入口路径等信息
        options, // 入口配置 - 包含着入口名称
        (err) => {
          // 添加入口完成之后回调的函数。
          callback(err);
        }
      );
    });
  }

  /**
   * @param {string} entry entry request
   * @param {EntryOptions | string} options entry options (passing string is deprecated)
   * @returns {EntryDependency} the dependency
   */
  static createDependency(entry, options) {
    const dep = new EntryDependency(entry);
    // TODO webpack 6 remove string option
    dep.loc = { name: typeof options === 'object' ? options.name : options };
    return dep;
  }
}

module.exports = EntryPlugin;
