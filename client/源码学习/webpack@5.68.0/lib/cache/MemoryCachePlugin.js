/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

/**
 * 在内存中进行缓存：
 *  1. 如果是多编译器(此时对应多配置项)时，缓存不共用
 * 	2. 在跨 Compiler 编译时(e.g watch 模式下，重新编译)，缓存共用
 */
class MemoryCachePlugin {
	/**
	 * Apply the plugin 注册插件
	 * @param {Compiler} compiler the compiler instance Compiler 实例
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Map<string, { etag: Etag | null, data: any }>} */
		const cache = new Map(); // 缓存存储 - 定义一个变量就相当于在内存中进行缓存

		// 保存缓存时触发这个方法
		compiler.cache.hooks.store.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
				// 设置缓存值
				cache.set(identifier, { etag, data });
			}
		);
		// 获取缓存时触发
		compiler.cache.hooks.get.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, gotHandlers) => {
				const cacheEntry = cache.get(identifier); // 根据缓存标识符获取缓存值，不存在则为 undefined
				if (cacheEntry === null /** 如果缓存数据就是 null */) {
					return null; // 直接返回
				} else if (cacheEntry !== undefined /** 存在缓存值 */) {
					// 在根据 etag 判断一下
					return cacheEntry.etag === etag ? cacheEntry.data : null;
				}
				/**
				 * 这应该是为了给缓存链处理的。。。
				 */
				gotHandlers.push((result, callback) => {
					if (result === undefined) {
						cache.set(identifier, null);
					} else {
						cache.set(identifier, { etag, data: result });
					}
					return callback();
				});
			}
		);

		// 清除缓存时触发
		compiler.cache.hooks.shutdown.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			() => {
				cache.clear();
			}
		);
	}
}
module.exports = MemoryCachePlugin;
