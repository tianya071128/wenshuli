/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NoModeWarning = require("./NoModeWarning");

/** @typedef {import("./Compiler")} Compiler */

class WarnNoModeSetPlugin {
	/**
	 * 插件在初始化 compilation 时调用，添加一个编译过程中的警告
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("WarnNoModeSetPlugin", compilation => {
			compilation.warnings.push(new NoModeWarning());
		});
	}
}

module.exports = WarnNoModeSetPlugin;
