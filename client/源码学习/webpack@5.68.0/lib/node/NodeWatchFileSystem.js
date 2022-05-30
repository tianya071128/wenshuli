/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const Watchpack = require("watchpack");

/** @typedef {import("../../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("../FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */
/** @typedef {import("../util/fs").WatchFileSystem} WatchFileSystem */
/** @typedef {import("../util/fs").WatchMethod} WatchMethod */
/** @typedef {import("../util/fs").Watcher} Watcher */

class NodeWatchFileSystem {
	constructor(inputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		this.watcherOptions = {
			aggregateTimeout: 0
		};
		this.watcher = new Watchpack(this.watcherOptions);
	}

	/**
	 * @param {Iterable<string>} files watched files 监听文件
	 * @param {Iterable<string>} directories watched directories 监听目录
	 * @param {Iterable<string>} missing watched exitance entries 监听存在的条目
	 * @param {number} startTime timestamp of start time 开始时间戳
	 * @param {WatchOptions} options options object 监听配置项
	 * @param {function(Error=, Map<string, FileSystemInfoEntry>, Map<string, FileSystemInfoEntry>, Set<string>, Set<string>): void} callback aggregated callback 聚合的回调
	 * @param {function(string, number): void} callbackUndelayed callback when the first change was detected 检测到第一个更改时的回调
	 * @returns {Watcher} a watcher 一个观察者
	 */
	/**
	 * files：可以是文件或目录。对于文件，跟踪内容和存在更改 | 对于目录，仅跟踪存在和时间戳更改
	 * dirs：仅目录、目录内容（和子目录的内容，…），跟踪存在更改。假设存在，当在没有进一步信息的情况下找不到目录时，将发出删除事件
	 * missing：可以是文件或目录，仅跟踪存在更改。预期不存在，最初未找到时不会发出删除事件。
	 * 					假如文件和目录存在，如果在没有进一步信息的情况下找不到它们，则会发出删除事件
	 * 					假如文件和目录不存在，不会未发出移除事件
	 */
	watch(
		files,
		directories,
		missing,
		startTime,
		options,
		callback,
		callbackUndelayed
	) {
		if (!files || typeof files[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'files'"); // 无效的参数:文件
		}
		if (!directories || typeof directories[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'directories'"); // 无效的参数:“目录”
		}
		if (!missing || typeof missing[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'missing'"); // 无效的参数:“失踪”
		}
		if (typeof callback !== "function") {
			throw new Error("Invalid arguments: 'callback'"); // 无效的参数:“回调”
		}
		if (typeof startTime !== "number" && startTime) {
			throw new Error("Invalid arguments: 'startTime'"); // 无效参数:'start Time'
		}
		if (typeof options !== "object") {
			throw new Error("Invalid arguments: 'options'"); // 无效的参数:“选项”
		}
		if (typeof callbackUndelayed !== "function" && callbackUndelayed) {
			throw new Error("Invalid arguments: 'callbackUndelayed'"); // 无效参数:'callback Undelayed'
		}
		const oldWatcher = this.watcher; // 保存旧的 Watchpack 类 - 用于目录和文件监视的包装库。
		this.watcher = new Watchpack(options); // 新建一个 Watchpack 类 - 用于目录和文件监视的包装库。

		if (callbackUndelayed) {
			// 监听文件变动时间 -- 检测到第一个文件更改时就会触发 -- 并且只会触发一次
			this.watcher.once("change", callbackUndelayed); // 监听到第一个变更后马上触发的回调
		}

		const fetchTimeInfo = () => {
			const fileTimeInfoEntries = new Map();
			const contextTimeInfoEntries = new Map();
			if (this.watcher) {
				this.watcher.collectTimeInfoEntries(
					fileTimeInfoEntries,
					contextTimeInfoEntries
				);
			}
			return { fileTimeInfoEntries, contextTimeInfoEntries };
		};
		// 此时发送重新构建的事件 -- 表示暂时没有其他文件更改(watchOptions.aggregateTimeout)
		this.watcher.once("aggregated", (changes /** 所有更改的文件 */, removals /** 所有已删除的文件 */) => {
			// pause emitting events (avoids clearing aggregated changes and removals on timeout) 暂停发出事件(避免在超时时清除聚合的更改和删除)
			this.watcher.pause();

			if (this.inputFileSystem && this.inputFileSystem.purge) {
				const fs = this.inputFileSystem;
				for (const item of changes) {
					fs.purge(item);
				}
				for (const item of removals) {
					fs.purge(item);
				}
			}
			const { fileTimeInfoEntries, contextTimeInfoEntries } = fetchTimeInfo();
			callback(
				null,
				fileTimeInfoEntries,
				contextTimeInfoEntries,
				changes,
				removals
			);
		});

		// 启动监听文件(或目录)变动
		this.watcher.watch({ files, directories, missing, startTime });

		if (oldWatcher) {
			oldWatcher.close();
		}
		return {
			close: () => {
				if (this.watcher) {
					this.watcher.close();
					this.watcher = null;
				}
			},
			pause: () => {
				if (this.watcher) {
					this.watcher.pause();
				}
			},
			getAggregatedRemovals: util.deprecate(
				() => {
					const items = this.watcher && this.watcher.aggregatedRemovals;
					if (items && this.inputFileSystem && this.inputFileSystem.purge) {
						const fs = this.inputFileSystem;
						for (const item of items) {
							fs.purge(item);
						}
					}
					return items;
				},
				"Watcher.getAggregatedRemovals is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_GET_AGGREGATED_REMOVALS"
			),
			getAggregatedChanges: util.deprecate(
				() => {
					const items = this.watcher && this.watcher.aggregatedChanges;
					if (items && this.inputFileSystem && this.inputFileSystem.purge) {
						const fs = this.inputFileSystem;
						for (const item of items) {
							fs.purge(item);
						}
					}
					return items;
				},
				"Watcher.getAggregatedChanges is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_GET_AGGREGATED_CHANGES"
			),
			getFileTimeInfoEntries: util.deprecate(
				() => {
					return fetchTimeInfo().fileTimeInfoEntries;
				},
				"Watcher.getFileTimeInfoEntries is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_FILE_TIME_INFO_ENTRIES"
			),
			getContextTimeInfoEntries: util.deprecate(
				() => {
					return fetchTimeInfo().contextTimeInfoEntries;
				},
				"Watcher.getContextTimeInfoEntries is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_CONTEXT_TIME_INFO_ENTRIES"
			),
			getInfo: () => {
				const removals = this.watcher && this.watcher.aggregatedRemovals;
				const changes = this.watcher && this.watcher.aggregatedChanges;
				if (this.inputFileSystem && this.inputFileSystem.purge) {
					const fs = this.inputFileSystem;
					if (removals) {
						for (const item of removals) {
							fs.purge(item);
						}
					}
					if (changes) {
						for (const item of changes) {
							fs.purge(item);
						}
					}
				}
				const { fileTimeInfoEntries, contextTimeInfoEntries } = fetchTimeInfo();
				return {
					changes,
					removals,
					fileTimeInfoEntries,
					contextTimeInfoEntries
				};
			}
		};
	}
}

module.exports = NodeWatchFileSystem;
