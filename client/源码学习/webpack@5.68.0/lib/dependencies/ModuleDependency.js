/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");
const memoize = require("../util/memoize");

/** @typedef {import("../Dependency").TRANSITIVE} TRANSITIVE */
/** @typedef {import("../Module")} Module */

const getRawModule = memoize(() => require("../RawModule"));

class ModuleDependency extends Dependency {
	/**
	 * @param {string} request request path which needs resolving 需要解析的请求路径
	 */
	constructor(request) {
		super();
		this.request = request;
		this.userRequest = request;
		this.range = undefined;
		// assertions must be serialized by subclasses that use it 断言必须由使用它的子类序列化
		/** @type {Record<string, any> | undefined} */
		this.assertions = undefined;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = `module${this.request}`;
		if (this.assertions !== undefined) {
			str += JSON.stringify(this.assertions);
		}
		return str;
	}

	/**
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return true;
	}

	/**
	 * @param {string} context context directory
	 * @returns {Module} a module
	 */
	createIgnoredModule(context) {
		const RawModule = getRawModule();
		return new RawModule(
			"/* (ignored) */",
			`ignored|${context}|${this.request}`,
			`${this.request} (ignored)`
		);
	}

	serialize(context) {
		const { write } = context;
		write(this.request);
		write(this.userRequest);
		write(this.range);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.request = read();
		this.userRequest = read();
		this.range = read();
		super.deserialize(context);
	}
}

ModuleDependency.Template = DependencyTemplate;

module.exports = ModuleDependency;
