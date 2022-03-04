/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

class EntryDependency extends ModuleDependency {
	/**
	 * @param {string} request request path for entry
	 */
	constructor(request) {
		super(request);
	}

	// 依赖项类型的显示名称
	get type() {
		return "entry";
	}

	// 一个依赖类别，典型的类别是"commonjs"， "amd"， "esm" 
	get category() {
		return "esm";
	}
}

makeSerializable(EntryDependency, "webpack/lib/dependencies/EntryDependency");

module.exports = EntryDependency;
