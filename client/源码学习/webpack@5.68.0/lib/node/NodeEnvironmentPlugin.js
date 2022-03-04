/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
const fs = require("graceful-fs"); // 作为 fs 模块的替代品，进行了各种改进。
const createConsoleLogger = require("../logging/createConsoleLogger");
const NodeWatchFileSystem = require("./NodeWatchFileSystem");
const nodeConsole = require("./nodeConsole");

/** @typedef {import("../../declarations/WebpackOptions").InfrastructureLogging} InfrastructureLogging */
/** @typedef {import("../Compiler")} Compiler */
// 从语义的角度看，这应该是准备 Node 环境相关配置的插件
class NodeEnvironmentPlugin {
	/**
	 * @param {Object} options options
	 * @param {InfrastructureLogging} options.infrastructureLogging infrastructure logging options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin 应用插件
	 * @param {Compiler} compiler the compiler instance Compiler 实例
	 * @returns {void}
	 */
	apply(compiler) {
		const { infrastructureLogging } = this.options;
		// 日志打印工具
		compiler.infrastructureLogger = createConsoleLogger({
			level: infrastructureLogging.level || "info",
			debug: infrastructureLogging.debug || false,
			console:
				infrastructureLogging.console ||
				nodeConsole({
					colors: infrastructureLogging.colors,
					appendOnly: infrastructureLogging.appendOnly,
					stream: infrastructureLogging.stream
				})
		});
		// 应该是读取文件系统 - 改进 Node 的 fs 模块
		compiler.inputFileSystem = new CachedInputFileSystem(fs, 60000);
		const inputFileSystem = compiler.inputFileSystem; // 闭包缓存一下
		compiler.outputFileSystem = fs; // 写入文件系统
		compiler.intermediateFileSystem = fs; // 中间文件系统
		// 监听文件系统
		compiler.watchFileSystem = new NodeWatchFileSystem(
			compiler.inputFileSystem
		);
		// 注册 beforeRun 钩子：在开始执行一次构建之前调用，compiler.run 方法开始执行后立刻进行调用
		compiler.hooks.beforeRun.tap("NodeEnvironmentPlugin", compiler => {
			if (compiler.inputFileSystem === inputFileSystem) {
				compiler.fsStartTime = Date.now();
				inputFileSystem.purge();
			}
		});
	}
}

module.exports = NodeEnvironmentPlugin;
