/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ChunkGroup = require("./ChunkGroup");

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("./Chunk")} Chunk */

/** @typedef {{ name?: string } & Omit<EntryDescription, "import">} EntryOptions */

/**
 * Entrypoint serves as an encapsulation primitive for chunks that are Entrypoint 用作块的封装原语
 * a part of a single ChunkGroup. They represent all bundles that need to be loaded for a 单个 Chunk Group 的一部分。它们表示需要加载的所有包
 * single instance of a page. Multi-page application architectures will typically yield multiple Entrypoint objects 页面的单个实例。多页面应用程序体系结构通常会产生多个 Entrypoint 对象
 * inside of the compilation, whereas a Single Page App may only contain one with many lazy-loaded chunks. 而一个单页应用可能只包含一个包含许多延迟加载块的应用
 */
class Entrypoint extends ChunkGroup {
	/**
	 * Creates an instance of Entrypoint. 创建 Entrypoint 的实例
	 * @param {EntryOptions | string} entryOptions the options for the entrypoint (or name) 入口点(或名称)的选项
	 * @param {boolean=} initial false, when the entrypoint is not initial loaded False，当入口点没有初始加载时
	 */
	constructor(entryOptions, initial = true) {
		// 如果是字符串，封装一下
		if (typeof entryOptions === "string") {
			entryOptions = { name: entryOptions };
		}
		super({
			name: entryOptions.name
		});
		this.options = entryOptions;
		/** @type {Chunk=} */
		this._runtimeChunk = undefined; // runtimeChunk -- 如果不抽离 runtime(webapck 运行时代码)，那么就是 entryChunk
		/** @type {Chunk=} */
		this._entrypointChunk = undefined; // entryChunk
		/** @type {boolean} */
		this._initial = initial;
	}

	/**
	 * @returns {boolean} true, when this chunk group will be loaded on initial page load
	 */
	isInitial() {
		return this._initial;
	}

	/**
	 * Sets the runtimeChunk for an entrypoint. 为入口点设置 runtimeChunk
	 * @param {Chunk} chunk the chunk being set as the runtime chunk. 被设置为运行时块的块
	 * @returns {void}
	 */
	setRuntimeChunk(chunk) {
		/**
		 * 为该入口 chunk 设置 runtimeChunk(在浏览器运行过程中，webpack 用来连接模块化应用程序所需的所有代码。)
		 * 例如：
		 * 	- entry.options.dependOn：当前入口所依赖的入口。它们必须在该入口被加载前被加载。
		 * 	- entry.options.runtime：运行时 chunk 的名字。如果设置了，就会创建一个新的运行时 chunk
		 * 	- optimization.runtimeChunk：就相当于设置 entry.options.runtime，会将值绑定到 entry.options.runtime
		 * 
		 * 指定 chunk 运行时的 runtimeChunk，如果指定了 dependOn 或 runtime，那么 runtimeChunk 就在 dependOn 或 runtime 指定 chunk 中，否则就跟 entryChunk 混在一起
		 */
		this._runtimeChunk = chunk;
	}

	/**
	 * Fetches the chunk reference containing the webpack bootstrap code
	 * @returns {Chunk | null} returns the runtime chunk or null if there is none
	 */
	getRuntimeChunk() {
		if (this._runtimeChunk) return this._runtimeChunk;
		for (const parent of this.parentsIterable) {
			if (parent instanceof Entrypoint) return parent.getRuntimeChunk();
		}
		return null;
	}

	/**
	 * Sets the chunk with the entrypoint modules for an entrypoint. 使用入口点模块设置块为入口点
	 * @param {Chunk} chunk the chunk being set as the entrypoint chunk. 被设置为 entrypoint 的 chunk
	 * @returns {void}
	 */
	setEntrypointChunk(chunk) {
		this._entrypointChunk = chunk;
	}

	/**
	 * Returns the chunk which contains the entrypoint modules 返回包含入口点模块的块
	 * (or at least the execution of them) (或者至少是执行)
	 * @returns {Chunk} chunk
	 */
	getEntrypointChunk() {
		return this._entrypointChunk;
	}

	/**
	 * @param {Chunk} oldChunk chunk to be replaced
	 * @param {Chunk} newChunk New chunk that will be replaced with
	 * @returns {boolean} returns true if the replacement was successful
	 */
	replaceChunk(oldChunk, newChunk) {
		if (this._runtimeChunk === oldChunk) this._runtimeChunk = newChunk;
		if (this._entrypointChunk === oldChunk) this._entrypointChunk = newChunk;
		return super.replaceChunk(oldChunk, newChunk);
	}
}

module.exports = Entrypoint;
