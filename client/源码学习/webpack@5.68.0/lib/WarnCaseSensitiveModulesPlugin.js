/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CaseSensitiveModulesWarning = require("./CaseSensitiveModulesWarning");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/**
 * 插件注册在 compilation.hooks.seal 时机，此时不在接收新的模块(模块构建完成)
 * 检测模块名称是否存在只有大小写不同(e.g：module.js 和 Module.js)，此时发出一个警告
 */
class WarnCaseSensitiveModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"WarnCaseSensitiveModulesPlugin",
			compilation => {
				/**
				 * compilation 对象停止接收新的模块时触发。
				 */
				compilation.hooks.seal.tap("WarnCaseSensitiveModulesPlugin", () => {
					/** @type {Map<string, Map<string, Module>>} */
					const moduleWithoutCase = new Map();
					/**
					 * 遍历所有模块，下面的逻辑生成如下结果的数据
					 * 	Map {
					 * 		lowerIdentifier(标识符统一为小写): Map {
					 * 			identifier(标识符): module
					 * 		}
					 * 	}
					 */
					for (const module of compilation.modules) {
						const identifier = module.identifier(); // 模块的标识符
						const lowerIdentifier = identifier.toLowerCase(); // 字符转为小写
						let map = moduleWithoutCase.get(lowerIdentifier);
						if (map === undefined) {
							map = new Map();
							moduleWithoutCase.set(lowerIdentifier, map);
						}
						map.set(identifier, module);
					}
					/**
					 * 如果模块只有大小写不同的话，发出一个警告
					 */
					for (const pair of moduleWithoutCase) {
						const map = pair[1];
						if (map.size > 1) {
							// 添加一个警告
							compilation.warnings.push(
								new CaseSensitiveModulesWarning(
									map.values(),
									compilation.moduleGraph
								)
							);
						}
					}
				});
			}
		);
	}
}

module.exports = WarnCaseSensitiveModulesPlugin;
