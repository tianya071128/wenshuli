/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const { basename, extname } = require("path");
const util = require("util");
const Chunk = require("./Chunk");
const Module = require("./Module");
const { parseResource } = require("./util/identifier");

/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compiler")} Compiler */

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

// 组装一下 id
const prepareId = id => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${match[1]} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};

// 返回一个可以获取 hash 并且截取指定长度的方法
const hashLength = (replacer, handler, assetInfo, hashName) => {
	const fn = (match, arg, input) => {
		let result;
		const length = arg && parseInt(arg, 10);

		if (length && handler) {
			result = handler(length);
		} else {
			const hash = replacer(match, arg, input);

			result = length ? hash.slice(0, length) : hash;
		}
		if (assetInfo) {
			assetInfo.immutable = true;
			if (Array.isArray(assetInfo[hashName])) {
				assetInfo[hashName] = [...assetInfo[hashName], result];
			} else if (assetInfo[hashName]) {
				assetInfo[hashName] = [assetInfo[hashName], result];
			} else {
				assetInfo[hashName] = result;
			}
		}
		return result;
	};

	return fn;
};
// 生成一个替换函数(就处理一下缓存的 value 值，并抛出)，会通过闭包缓存传入的 value 值
const replacer = (value, allowEmpty /** 是否允许空白 */) => {
	const fn = (match, arg, input) => {
		// 如果 value 是一个函数，那么调用函数获取值
		if (typeof value === "function") {
			value = value();
		}
		if (value === null || value === undefined) {
			if (!allowEmpty) {
				// 当值为空并且不允许为空白时，抛出错误
				throw new Error(
					`Path variable ${match} not implemented in this context: ${input}`
				);
			}

			return "";
		} else {
			return `${value}`;
		}
	};

	return fn;
};

const deprecationCache = new Map();
const deprecatedFunction = (() => () => { })();
// 废弃的模板占位符，会警告一下，还是会通过 fn 返回值
const deprecated = (fn, message, code) => {
	let d = deprecationCache.get(message);
	if (d === undefined) {
		d = util.deprecate(deprecatedFunction, message, code);
		deprecationCache.set(message, d);
	}
	return (...args) => {
		d();
		return fn(...args);
	};
};

/**
 * @param {string | function(PathData, AssetInfo=): string} path the raw path 原始路径 -- 定义的输出路径 -- js/[name].[fullhash].js
 * @param {PathData} data context data 上下文数据 -- 该 chunk 信息，包含 hash 值，contentHash 值
 * @param {AssetInfo} assetInfo extra info about the asset (will be written to) 有关资产的额外信息（将写入）
 * @returns {string} the interpolated path 插值路径 -- 替换模板后的文件名
 */
const replacePathVariables = (path, data, assetInfo) => {
	const chunkGraph = data.chunkGraph;

	/** @type {Map<string, Function>} */
	/**
	 * 这是用来存储所有的占位符策略：
	 *  {
	 * 		key: 'fullhash', // 占位符，见下方
	 * 		value: fn, // 取值函数 - 已经存储了实际值的，只是需要对值进一步处理
	 *  }
	 * 
	 * filename(文件层面替换内容) -- 会在生成 sourcemap 文件时触发
	 * 
	 * module(模块替换内容) 暂时不知道什么情况下会触发。。
	 */
	const replacements = new Map();

	// Filename context 文件名上下文 -- 文件层面替换的内容
	//
	// Placeholders 占位符
	// 
	// for /some/path/file.js?query#fragment:
	// [file] - /some/path/file.js
	// [query] - ?query
	// [fragment] - #fragment
	// [base] - file.js
	// [path] - /some/path/
	// [name] - file
	// [ext] - .js
	if (typeof data.filename === "string") {
		const { path: file, query, fragment } = parseResource(data.filename);

		const ext = extname(file);
		const base = basename(file);
		const name = base.slice(0, base.length - ext.length);
		const path = file.slice(0, file.length - base.length);

		replacements.set("file", replacer(file));
		replacements.set("query", replacer(query, true));
		replacements.set("fragment", replacer(fragment, true));
		replacements.set("path", replacer(path, true));
		replacements.set("base", replacer(base));
		replacements.set("name", replacer(name));
		replacements.set("ext", replacer(ext, true));
		// Legacy
		replacements.set(
			"filebase",
			deprecated(
				replacer(base),
				"[filebase] is now [base]",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
			)
		);
	}

	// Compilation context 编译上下文 
	//
	// Placeholders 占位符
	//
	// [fullhash] - data.hash (3a4b5c6e7f)
	//
	// Legacy Placeholders 遗留占位符
	//
	// [hash] - data.hash (3a4b5c6e7f)
	if (data.hash) {
		// 生成获取 fullhash 的方法并存入 replacements 集合中
		const hashReplacer = hashLength(
			replacer(data.hash), // data.hash 存储着的是 Compilation 的 hash
			data.hashWithLength,
			assetInfo,
			"fullhash"
		);

		replacements.set("fullhash", hashReplacer);

		// Legacy 遗留占位符，取值就是 fullhash 
		replacements.set(
			"hash",
			deprecated(
				hashReplacer,
				"[hash] is now [fullhash] (also consider using [chunkhash] or [contenthash], see documentation for details)", // [hash]现在是[fullhash]（也考虑使用[chunkhash）或[contenthash]，详见文档）
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_HASH"
			)
		);
	}

	// Chunk Context chunk 上下文 -- chunk 层面
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [name] - chunk.name (app.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256u3zg.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const contentHashType = data.contentHashType;

		/**
		 * chunk id：在 development 环境下，一般会具体名称，对于 entry 就是 name，对于 「按需加载 chunk」，一般是路径拼接的
		 * 					 在 production 环境下，一般是几个数字，具体待后续查看
		 */
		const idReplacer = replacer(chunk.id); 
		/**
		 * chunk name：对于入口，name 就是 entry 的 key
		 * 						 对于「按需加载 chunk」，可以通过 webpackChunkName 注释指定 chunk 名称。
		 */
		const nameReplacer = replacer(chunk.name || chunk.id);
		/**
		 * chunkhash：此 chunk 的 hash 值，包含该 chunk 的所有元素
		 */
		const chunkhashReplacer = hashLength(
			replacer(chunk instanceof Chunk ? chunk.renderedHash : chunk.hash),
			"hashWithLength" in chunk ? chunk.hashWithLength : undefined,
			assetInfo,
			"chunkhash"
		);
		/**
		 * contenthash：此 chunk 的 hash 值，只包括该内容类型的元素（受 optimization.realContentHash 影响）
		 */
		const contenthashReplacer = hashLength(
			replacer(
				data.contentHash ||
					(contentHashType &&
						chunk.contentHash &&
						chunk.contentHash[contentHashType])
			),
			data.contentHashWithLength ||
				("contentHashWithLength" in chunk && chunk.contentHashWithLength
					? chunk.contentHashWithLength[contentHashType]
					: undefined),
			assetInfo,
			"contenthash"
		);

		replacements.set("id", idReplacer);
		replacements.set("name", nameReplacer);
		replacements.set("chunkhash", chunkhashReplacer);
		replacements.set("contenthash", contenthashReplacer);
	}

	// Module Context 模块上下文 - 模块层面
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [hash] - module.hash (6237543873.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;

		const idReplacer = replacer(() =>
			prepareId(
				module instanceof Module ? chunkGraph.getModuleId(module) : module.id
			)
		);
		const moduleHashReplacer = hashLength(
			replacer(() =>
				module instanceof Module
					? chunkGraph.getRenderedModuleHash(module, data.runtime)
					: module.hash
			),
			"hashWithLength" in module ? module.hashWithLength : undefined,
			assetInfo,
			"modulehash"
		);
		const contentHashReplacer = hashLength(
			replacer(data.contentHash),
			undefined,
			assetInfo,
			"contenthash"
		);

		replacements.set("id", idReplacer);
		replacements.set("modulehash", moduleHashReplacer);
		replacements.set("contenthash", contentHashReplacer);
		replacements.set(
			"hash",
			data.contentHash ? contentHashReplacer : moduleHashReplacer
		);
		// Legacy
		replacements.set(
			"moduleid",
			deprecated(
				idReplacer,
				"[moduleid] is now [id]",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_MODULE_ID"
			)
		);
	}

	// Other things 其他东西 -- URL 层面
	if (data.url) {
		replacements.set("url", replacer(data.url));
	}
	if (typeof data.runtime === "string") {
		replacements.set(
			"runtime",
			replacer(() => prepareId(data.runtime))
		);
	} else {
		replacements.set("runtime", replacer("_"));
	}

	if (typeof path === "function") {
		path = path(data, assetInfo);
	}
	/**
	 * 解析 path，解析出所有的占位符，例如：js/[name].[fullhash].[file].js
	 * 会解析出 [name]、[fullhash]、[file]。
	 * 然后会使用上面各个解析出来的占位符策略(replacements)去解析这些占位符
	 */
	path = path.replace(REGEXP, (match, content) => {
		if (content.length + 2 === match.length) {
			const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
			if (!contentMatch) return match;
			const [, kind, arg] = contentMatch;
			const replacer = replacements.get(kind);
			if (replacer !== undefined) {
				return replacer(match, arg, path);
			}
		} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
			return `[${match.slice(2, -2)}]`;
		}
		return match;
	});

	return path;
};

const plugin = "TemplatedPathPlugin";

/**
 * 用于替换模板字符串生成文件名
 * 这个是针对每个经过 Compilation 生成的资产都会调用这个方法，不仅限于 entry、「按需加载 chunk」，还有 plugin 也会经过这个。。。
 */
class TemplatedPathPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, compilation => {
			// 会注册 hooks.assetPath 钩子，这样每个资产生成文件名时都会经过这个事件
			compilation.hooks.assetPath.tap(plugin, replacePathVariables);
		});
	}
}

module.exports = TemplatedPathPlugin;
