/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const EntryDependency = require("./dependencies/EntryDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

// 每个入口的启动入口，会遍历入口配置
class EntryPlugin {
	/**
	 * An entry plugin which will handle 一个可以处理
	 * creation of the EntryDependency 创建 EntryDependency
	 *
	 * @param {string} context context path 入口的上下文路径。
	 * @param {string} entry entry path 入口路径
	 * @param {EntryOptions | string=} options entry options (passing a string is deprecated) 入口配置(不推荐传递字符串)
	 */
	constructor(context, entry, options) {
		this.context = context;
		this.entry = entry;
		this.options = options || "";
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"EntryPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					EntryDependency,
					normalModuleFactory
				);
			}
		);

		const { entry, options, context } = this;
		const dep = EntryPlugin.createDependency(entry, options);

		// 注册 compiler.make(compilation 结束之前执行) 钩子
		compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
			// addEntry：为编译添加入口
			compilation.addEntry(context, // 入口的上下文路径。
				dep, // 入口依赖 - 包含着入口路径等信息
				options, // 入口配置 - 包含着入口名称
				err => { // 添加入口完成之后回调的函数。
					callback(err);
				});
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
		dep.loc = { name: typeof options === "object" ? options.name : options };
		return dep;
	}
}

module.exports = EntryPlugin;
