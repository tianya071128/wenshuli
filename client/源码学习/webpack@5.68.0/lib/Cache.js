/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { AsyncParallelHook, AsyncSeriesBailHook, SyncHook } = require("tapable");
const {
	makeWebpackError,
	makeWebpackErrorCallback
} = require("./HookWebpackError");

/** @typedef {import("./WebpackError")} WebpackError */

/**
 * @typedef {Object} Etag
 * @property {function(): string} toString
 */

/**
 * @template T
 * @callback CallbackCache
 * @param {(WebpackError | null)=} err
 * @param {T=} result
 * @returns {void}
 */

/**
 * @callback GotHandler
 * @param {any} result
 * @param {function(Error=): void} callback
 * @returns {void}
 */

const needCalls = (times, callback) => {
	return err => {
		if (--times === 0) {
			return callback(err);
		}
		if (err && times > 0) {
			times = 0;
			return callback(err);
		}
	};
};

class Cache {
	constructor() {
		this.hooks = {
			/** @type {AsyncSeriesBailHook<[string, Etag | null, GotHandler[]], any>} */
			get: new AsyncSeriesBailHook(["identifier", "etag", "gotHandlers"]),
			/** @type {AsyncParallelHook<[string, Etag | null, any]>} */
			store: new AsyncParallelHook(["identifier", "etag", "data"]),
			/** @type {AsyncParallelHook<[Iterable<string>]>} */
			storeBuildDependencies: new AsyncParallelHook(["dependencies"]),
			/** @type {SyncHook<[]>} */
			beginIdle: new SyncHook([]),
			/** @type {AsyncParallelHook<[]>} */
			endIdle: new AsyncParallelHook([]),
			/** @type {AsyncParallelHook<[]>} */
			shutdown: new AsyncParallelHook([])
		};
	}

	/**
	 * @template T
	 * @param {string} identifier the cache identifier 缓存的标识符
	 * @param {Etag | null} etag the etag
	 * @param {CallbackCache<T>} callback signals when the value is retrieved 在检索值时发出信号
	 * @returns {void}
	 */
	get(identifier, etag, callback) {
		const gotHandlers = []; // 
		// 猜测:在提取缓存前的钩子
		this.hooks.get.callAsync(identifier, etag, gotHandlers, (err, result) => {
			// 出现错误,抛出错误
			if (err) {
				callback(makeWebpackError(err, "Cache.hooks.get"));
				return;
			}
			// 没有提取出缓存值
			if (result === null) {
				result = undefined;
			}
			if (gotHandlers.length > 1) {
				const innerCallback = needCalls(gotHandlers.length, () =>
					callback(null, result)
				);
				for (const gotHandler of gotHandlers) {
					gotHandler(result, innerCallback);
				}
			} else if (gotHandlers.length === 1) {
				gotHandlers[0](result, () => callback(null, result));
			} else {
				callback(null, result);
			}
		});
	}

	/**
	 * @template T
	 * @param {string} identifier the cache identifier 缓存的标识符
	 * @param {Etag | null} etag the etag
	 * @param {T} data the value to store 要存储的值
	 * @param {CallbackCache<void>} callback signals when the value is stored 在存储值时发出信号
	 * @returns {void}
	 */
	store(identifier, etag, data, callback) {
		this.hooks.store.callAsync(
			identifier,
			etag,
			data,
			makeWebpackErrorCallback(callback, "Cache.hooks.store")
		);
	}

	/**
	 * After this method has succeeded the cache can only be restored when build dependencies are 此方法成功后，仅当生成依赖项被删除时，才能恢复缓存
	 * @param {Iterable<string>} dependencies list of all build dependencies
	 * @param {CallbackCache<void>} callback signals when the dependencies are stored
	 * @returns {void}
	 */
	storeBuildDependencies(dependencies, callback) {
		this.hooks.storeBuildDependencies.callAsync(
			dependencies,
			makeWebpackErrorCallback(callback, "Cache.hooks.storeBuildDependencies")
		);
	}

	/**
	 * Compiler 开始闲置时触发
	 * @returns {void}
	 */
	beginIdle() {
		this.hooks.beginIdle.call();
	}

	/**
	 * Compiler 结束闲置时触发(此时 Compiler 开始构建)
	 * @param {CallbackCache<void>} callback signals when the call finishes 调用结束时发出的信号
	 * @returns {void}
	 */
	endIdle(callback) {
		this.hooks.endIdle.callAsync(
			makeWebpackErrorCallback(callback, "Cache.hooks.endIdle")
		);
	}

	/**
	 * 当 Compiler 编译器关闭会调用方法
	 * @param {CallbackCache<void>} callback signals when the call finishes 调用结束时发出的信号
	 * @returns {void}
	 */
	shutdown(callback) {
		// 清除缓存
		this.hooks.shutdown.callAsync(
			makeWebpackErrorCallback(callback, "Cache.hooks.shutdown") // 返回一个封装处理 err 的方法，内部会处理错误
		);
	}
}

Cache.STAGE_MEMORY = -10;
Cache.STAGE_DEFAULT = 0;
Cache.STAGE_DISK = 10;
Cache.STAGE_NETWORK = 20;

module.exports = Cache;
