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

class MemoryWithGcCachePlugin {
	constructor({ maxGenerations }) {
		this._maxGenerations = maxGenerations; // 定义内存缓存中未使用的缓存项的生命周期(在多少次之后清除)
	}
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const maxGenerations = this._maxGenerations; // 内存缓存中未使用的缓存项的生命周期
		/** @type {Map<string, { etag: Etag | null, data: any }>} */
		const cache = new Map(); // 最新缓存
		/** @type {Map<string, { entry: { etag: Etag | null, data: any }, until: number }>} */
		const oldCache = new Map(); // 旧的缓存
		let generation = 0; // 构建次数计数
		let cachePosition = 0;
		const logger = compiler.getInfrastructureLogger("MemoryWithGcCachePlugin"); // Logger 类：输出消息
		/**
		 * afterDone：在一次构建结束之后，注册这个钩子，用于计算 Compiler 构建次数
		 */
		compiler.hooks.afterDone.tap("MemoryWithGcCachePlugin", () => {
			generation++; // 构建次数加 1
			let clearedEntries = 0; // 清除失效缓存个数
			let lastClearedIdentifier; // 
			/**
			 * 遍历还存在于旧缓存系统的值，这个就表示没有使用的缓存
			 * 如果不活动的缓存存在于 oldCache 中次数已超出限制，则进行清除工作
			 */
			for (const [identifier, entry] of oldCache) {
				// entry.until：表示该缓存数据最多存在的构建次数，下面会进行赋值
				if (entry.until > generation) break; // 如果还允许存在的话，那么就退出当前循环

				// 这里就表示该缓存已经失效，应该进行清除
				oldCache.delete(identifier);
				if (cache.get(identifier) === undefined) {
					cache.delete(identifier); 
					clearedEntries++; // 清除了失效缓存个数
					lastClearedIdentifier = identifier; // 最后一个被清除缓存的标识符
				}
			}
			// 如果存在失效缓存或着未使用的缓存
			if (clearedEntries > 0 || oldCache.size > 0) {
				logger.log(
					`${cache.size - oldCache.size} active entries, ${ // 活跃的条目
						oldCache.size
					} recently unused cached entries${ // 最近未使用的缓存条目
						clearedEntries > 0
							? `, ${clearedEntries} old unused cache entries removed e. g. ${lastClearedIdentifier}` // 旧的未使用的缓存条目被删除
							: ""
					}`
				);
			}
			let i = (cache.size / maxGenerations) | 0;
			let j = cachePosition >= cache.size ? 0 : cachePosition;
			cachePosition = j + i;
			// 当一次构建结束，将新的缓存项移到 oldCache 中，并给每个缓存项都新增 until 标识，表示缓存的生命周期
			for (const [identifier, entry] of cache) {
				if (j !== 0) {
					j--;
					continue;
				}
				// 存在缓存值的话
				if (entry !== undefined) {
					// We don't delete the cache entry, but set it to undefined instead 我们不删除缓存表项，而是将其设为undefined。
					// This reserves the location in the data table and avoids rehashing 这样就保留了数据表中的位置，避免了重哈希
					// when constantly adding and removing entries. 当不断添加和删除条目时
					// It will be deleted when removed from oldCache. 当从旧Cache中移除时，它将被删除
					cache.set(identifier, undefined);
					oldCache.delete(identifier);
					oldCache.set(identifier, {
						entry,
						until: generation + maxGenerations // 赋值生命周期
					});
					if (i-- === 0) break;
				}
			}
		});
		// 保存缓存时触发
		compiler.cache.hooks.store.tap(
			{ name: "MemoryWithGcCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
				// 设置缓存时，直接设置
				cache.set(identifier, { etag, data });
			}
		);
		// 获取缓存时触发
		compiler.cache.hooks.get.tap(
			{ name: "MemoryWithGcCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, gotHandlers) => {
				const cacheEntry = cache.get(identifier); // 根据缓存标识符获取缓存值，不存在则为 undefined
				if (cacheEntry === null /** 如果缓存数据就是 null */) {
					return null;
				} else if (cacheEntry !== undefined /** 存在缓存值 */) {
					// 在根据 etag 判断一下
					return cacheEntry.etag === etag ? cacheEntry.data : null;
				}
				/**
				 * 如果新的缓存系统中不存在时，那么就从旧缓存系统中提取值
				 *  1. 如果旧缓存系统存在缓存值，那么就移植到新缓存系统中
				 *  2. 不存在的话，不做处理
				 * 
				 * 这样在一次构建结束后，就可以标识旧缓存系统中的缓存数据是没有使用过的，达到设置值 maxGenerations 后清除缓存
				 */
				const oldCacheEntry = oldCache.get(identifier); // 尝试从旧的缓存系统中提取值
				// 旧的缓存系统中存在值
				if (oldCacheEntry !== undefined) {
					// 提取值出来
					const cacheEntry = oldCacheEntry.entry;
					// 如果缓存值为 null
					if (cacheEntry === null) {
						oldCache.delete(identifier); // 从旧的缓存系统中删除该缓存
						cache.set(identifier, cacheEntry); // 添加到新的缓存系统中
						return null;
					} else {
						// 如果 etag 不同，直接返回 null
						if (cacheEntry.etag !== etag) return null;
						// 此时可以重用旧缓存中的值
						oldCache.delete(identifier); // 从旧缓存系统中删除
						cache.set(identifier, cacheEntry); // 添加到新的缓存系统中
						return cacheEntry.data; // 返回缓存值
					}
				}
				/**
				 * 与 MemoryCachePlugin 插件同理：
				 * 	如果存在其他渠道缓存(例如文件系统)，那么会让文件系统返回值后，执行这个方法进行缓存一下
				 */
				gotHandlers.push((result, callback) => {
					if (result === undefined) {
						cache.set(identifier, null);
					} else {
						// 从其他渠道中获取了缓存值，设置其值
						cache.set(identifier, { etag, data: result });
					}
					return callback();
				});
			}
		);
		// 清除缓存时触发
		compiler.cache.hooks.shutdown.tap(
			{ name: "MemoryWithGcCachePlugin", stage: Cache.STAGE_MEMORY },
			() => {
				cache.clear();
				oldCache.clear();
			}
		);
	}
}
module.exports = MemoryWithGcCachePlugin;
