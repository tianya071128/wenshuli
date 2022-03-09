/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */

class InvalidDependenciesModuleWarning extends WebpackError {
	/**
	 * @param {Module} module module tied to dependency
	 * @param {Iterable<string>} deps invalid dependencies
	 */
	constructor(module, deps) {
		const orderedDeps = deps ? Array.from(deps).sort() : [];
		const depsList = orderedDeps.map(dep => ` * ${JSON.stringify(dep)}`);
		// 此模块的插件或加载程序报告了无效的依赖项。所有报告的依赖关系需要是绝对路径。无效的依赖关系可能导致监视和缓存中断。我们尽最大努力将所有无效值转换为绝对路径，并将globs转换为上下文依赖关系，但这是不赞成的行为。加载器:将绝对路径传递给它。添加依赖(现有文件)，这个。添加Missing Dependency(不存在的文件)，以及这个。添加上下文依赖(目录)。插件:将绝对路径传递到文件Dependencies(现有文件)、缺少的依赖(非现有文件)和上下文依赖(目录)。Globs:不支持。将绝对路径作为上下文依赖关系传递到目录。报告了以下无效值
		super(`Invalid dependencies have been reported by plugins or loaders for this module. All reported dependencies need to be absolute paths.
Invalid dependencies may lead to broken watching and caching.
As best effort we try to convert all invalid values to absolute paths and converting globs into context dependencies, but this is deprecated behavior.
Loaders: Pass absolute paths to this.addDependency (existing files), this.addMissingDependency (not existing files), and this.addContextDependency (directories).
Plugins: Pass absolute paths to fileDependencies (existing files), missingDependencies (not existing files), and contextDependencies (directories).
Globs: They are not supported. Pass absolute path to the directory as context dependencies.
The following invalid values have been reported:
${depsList.slice(0, 3).join("\n")}${
			depsList.length > 3 ? "\n * and more ..." : ""
		}`);

		this.name = "InvalidDependenciesModuleWarning";
		this.details = depsList.slice(3).join("\n");
		this.module = module;
	}
}

makeSerializable(
	InvalidDependenciesModuleWarning,
	"webpack/lib/InvalidDependenciesModuleWarning"
);

module.exports = InvalidDependenciesModuleWarning;
