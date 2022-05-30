/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Stats = require("./Stats");

/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */

/**
 * @template T
 * @callback Callback
 * @param {(Error | null)=} err
 * @param {T=} result
 */

class Watching {
	/**
	 * @param {Compiler} compiler the compiler 编译器
	 * @param {WatchOptions} watchOptions options watchOptions
	 * @param {Callback<Stats>} handler completion handler 完成处理器
	 */
	constructor(compiler, watchOptions, handler) {
		this.startTime = null; // 初始 watch 开始时间
		this.invalid = false;
		this.handler = handler; // 每次构建资源成功后回调
		/** @type {Callback<void>[]} */
		this.callbacks = [];
		/** @type {Callback<void>[] | undefined} */
		this._closeCallbacks = undefined;
		this.closed = false; // 是否监听结束了
		this.suspended = false;
		this.blocked = false;
		this._isBlocked = () => false;
		this._onChange = () => {};
		this._onInvalid = () => { };
		// 规范化 watchOptions -- 最后规范为对象
		if (typeof watchOptions === "number") {
			this.watchOptions = {
				aggregateTimeout: watchOptions
			};
		} else if (watchOptions && typeof watchOptions === "object") {
			this.watchOptions = { ...watchOptions };
		} else {
			this.watchOptions = {};
		}
		// watchOptions.aggregateTimeout：当第一个文件更改，会在重新构建前增加延迟。这个选项允许 webpack 将这段时间内进行的任何其他更改都聚合到一次重新构建里。
		// 如果没有配置的话，那么就默认为 20ms
		if (typeof this.watchOptions.aggregateTimeout !== "number") {
			this.watchOptions.aggregateTimeout = 20;
		}
		this.compiler = compiler;
		this.running = false; // 是否在运行标识 -- 在一次监听中，如果构建完成就会重置为 false，在构建的过程中的话就会 true
		this._initial = true; // 初始标识
		this._invalidReported = true;
		this._needRecords = true;
		this.watcher = undefined;
		this.pausedWatcher = undefined;
		/** @type {Set<string>} */
		this._collectedChangedFiles = undefined;
		/** @type {Set<string>} */
		this._collectedRemovedFiles = undefined;
		this._done = this._done.bind(this);
		process.nextTick(() => {
			// 当是初次 watch 时，启动监听构建流程
			if (this._initial) this._invalidate();
		});
	}

	/**
	 * @param {ReadonlySet<string>} changedFiles changed files
	 * @param {ReadonlySet<string>} removedFiles removed files
	 */
	_mergeWithCollected(changedFiles, removedFiles) {
		if (!changedFiles) return;
		if (!this._collectedChangedFiles) {
			this._collectedChangedFiles = new Set(changedFiles);
			this._collectedRemovedFiles = new Set(removedFiles);
		} else {
			for (const file of changedFiles) {
				this._collectedChangedFiles.add(file);
				this._collectedRemovedFiles.delete(file);
			}
			for (const file of removedFiles) {
				this._collectedChangedFiles.delete(file);
				this._collectedRemovedFiles.add(file);
			}
		}
	}

	/**
	 * @param {ReadonlyMap<string, FileSystemInfoEntry | "ignore">=} fileTimeInfoEntries info for files 信息的文件
	 * @param {ReadonlyMap<string, FileSystemInfoEntry | "ignore">=} contextTimeInfoEntries info for directories 信息的目录
	 * @param {ReadonlySet<string>=} changedFiles changed files 改变了文件
	 * @param {ReadonlySet<string>=} removedFiles removed files 删除文件
	 * @returns {void}
	 */
	_go(fileTimeInfoEntries, contextTimeInfoEntries, changedFiles, removedFiles) {
		this._initial = false; // 初始标识置为 false
		if (this.startTime === null) this.startTime = Date.now(); // 初始 watch 开始时间
		this.running = true;
		if (this.watcher) {
			this.pausedWatcher = this.watcher;
			this.lastWatcherStartTime = Date.now(); // 最后一次 watch 开始时间 -- 也是表示构建这些资源时的时间，用于比较文件时间戳
			this.watcher.pause();
			this.watcher = null;
		} else if (!this.lastWatcherStartTime) {
			this.lastWatcherStartTime = Date.now(); // 最后一次 watch 开始时间 -- 也是表示构建这些资源时的时间，用于比较文件时间戳
		}
		this.compiler.fsStartTime = Date.now();
		if (
			changedFiles &&
			removedFiles &&
			fileTimeInfoEntries &&
			contextTimeInfoEntries
		) {
			this._mergeWithCollected(changedFiles, removedFiles);
			this.compiler.fileTimestamps = fileTimeInfoEntries;
			this.compiler.contextTimestamps = contextTimeInfoEntries;
		} else if (this.pausedWatcher) {
			if (this.pausedWatcher.getInfo) {
				const {
					changes,
					removals,
					fileTimeInfoEntries,
					contextTimeInfoEntries
				} = this.pausedWatcher.getInfo();
				this._mergeWithCollected(changes, removals);
				this.compiler.fileTimestamps = fileTimeInfoEntries;
				this.compiler.contextTimestamps = contextTimeInfoEntries;
			} else {
				this._mergeWithCollected(
					this.pausedWatcher.getAggregatedChanges &&
						this.pausedWatcher.getAggregatedChanges(),
					this.pausedWatcher.getAggregatedRemovals &&
						this.pausedWatcher.getAggregatedRemovals()
				);
				this.compiler.fileTimestamps =
					this.pausedWatcher.getFileTimeInfoEntries();
				this.compiler.contextTimestamps =
					this.pausedWatcher.getContextTimeInfoEntries();
			}
		}
		this.compiler.modifiedFiles = this._collectedChangedFiles;
		this._collectedChangedFiles = undefined;
		this.compiler.removedFiles = this._collectedRemovedFiles;
		this._collectedRemovedFiles = undefined;

		const run = () => {
			if (this.compiler.idle) {
				return this.compiler.cache.endIdle(err => {
					if (err) return this._done(err);
					this.compiler.idle = false;
					run();
				});
			}
			if (this._needRecords) {
				return this.compiler.readRecords(err => {
					if (err) return this._done(err);

					this._needRecords = false;
					run();
				});
			}
			this.invalid = false;
			this._invalidReported = false;
			/**
			 * watchRun：在监听模式下，一个新的 compilation 触发之后，但在 compilation 实际开始之前执行 -- 异步串联执行
			 */
			this.compiler.hooks.watchRun.callAsync(this.compiler, err => {
				if (err) return this._done(err); // 错误，交给 _done 处理错误
				const onCompiled = (err, compilation) => {
					if (err) return this._done(err, compilation); // 错误，交给 _done 处理错误
					if (this.invalid) return this._done(null, compilation);

					/**
					 * 在输出 asset 之前调用。返回一个布尔值，告知是否输出。
					 */
					if (this.compiler.hooks.shouldEmit.call(compilation) === false) {
						return this._done(null, compilation);
					}
					// 在下一个微任务队列中执行
					process.nextTick(() => {
						const logger = compilation.getLogger("webpack.Compiler");
						logger.time("emitAssets");
						// 发送构建的资源 -- 此时 asset 已经输出到 output 目录(似乎是异步构建的)
						this.compiler.emitAssets(compilation, err => {
							logger.timeEnd("emitAssets");
							if (err) return this._done(err, compilation); // 错误，交给 _done 处理错误
							if (this.invalid) return this._done(null, compilation);

							logger.time("emitRecords");
							this.compiler.emitRecords(err => {
								logger.timeEnd("emitRecords");
								if (err) return this._done(err, compilation);

								if (compilation.hooks.needAdditionalPass.call()) {
									compilation.needAdditionalPass = true;

									compilation.startTime = this.startTime;
									compilation.endTime = Date.now();
									logger.time("done hook");
									const stats = new Stats(compilation);
									this.compiler.hooks.done.callAsync(stats, err => {
										logger.timeEnd("done hook");
										if (err) return this._done(err, compilation);

										this.compiler.hooks.additionalPass.callAsync(err => {
											if (err) return this._done(err, compilation);
											this.compiler.compile(onCompiled);
										});
									});
									return;
								}
								return this._done(null, compilation); // 资源构建完成并输出到目录后，应该就是 compiler 工作已经处理好了，交给 _done 处理
							});
						});
					});
				};

				// 通知 compiler 启动资源构建，执行完成以后，chunks 都已经构建完成，但是还没有发送文件
				this.compiler.compile(onCompiled);
			});
		};

		run();
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {Stats} the compilation stats
	 */
	_getStats(compilation) {
		const stats = new Stats(compilation);
		return stats;
	}

	/**
	 * @param {Error=} err an optional error 一个可选的错误
	 * @param {Compilation=} compilation the compilation 编译
	 * @returns {void}
	 */
	_done(err, compilation) {
		this.running = false; // 构建流程已结束

		const logger = compilation && compilation.getLogger("webpack.Watching");

		let stats = null;

		const handleError = (err, cbs) => {
			this.compiler.hooks.failed.call(err);
			this.compiler.cache.beginIdle();
			this.compiler.idle = true;
			this.handler(err, stats);
			if (!cbs) {
				cbs = this.callbacks;
				this.callbacks = [];
			}
			for (const cb of cbs) cb(err);
		};

		if (
			this.invalid &&
			!this.suspended &&
			!this.blocked &&
			!(this._isBlocked() && (this.blocked = true))
		) {
			if (compilation) {
				logger.time("storeBuildDependencies");
				this.compiler.cache.storeBuildDependencies(
					compilation.buildDependencies,
					err => {
						logger.timeEnd("storeBuildDependencies");
						if (err) return handleError(err);
						this._go();
					}
				);
			} else {
				this._go();
			}
			return;
		}

		if (compilation) {
			compilation.startTime = this.startTime;
			compilation.endTime = Date.now();
			stats = new Stats(compilation);
		}
		this.startTime = null;
		if (err) return handleError(err); // 在构建过程中出现错误的话，就交给 handleError 处理

		const cbs = this.callbacks;
		this.callbacks = [];
		logger.time("done hook");
		/** 
		 * 在 compilation 完成时执行 -- 异步串联执行
		 */
		this.compiler.hooks.done.callAsync(stats, err => {
			logger.timeEnd("done hook");
			if (err) return handleError(err, cbs);
			this.handler(null, stats); // 构建资源成功回调
			logger.time("storeBuildDependencies");
			this.compiler.cache.storeBuildDependencies(
				compilation.buildDependencies,
				err => {
					logger.timeEnd("storeBuildDependencies");
					if (err) return handleError(err, cbs);
					logger.time("beginIdle");
					this.compiler.cache.beginIdle();
					this.compiler.idle = true;
					logger.timeEnd("beginIdle");
					process.nextTick(() => {
						// 上面的都是启动 compiler 执行构建资源的操作，接下来这里才是实现 watch 的关键地方
						if (!this.closed) {
							this.watch(
								compilation.fileDependencies,
								compilation.contextDependencies,
								compilation.missingDependencies
							);
						}
					});
					for (const cb of cbs) cb(null);
					this.compiler.hooks.afterDone.call(stats);
				}
			);
		});
	}

	/**
	 * @param {Iterable<string>} files watched files 监听文件 -- 包含项目所有的模块文件以及一些 loader 添加的
	 * @param {Iterable<string>} dirs watched directories 监听目录
	 * @param {Iterable<string>} missing watched existence entries 监听存在的条目 -- 这里应该是项目依赖模块的相关文件，如 style-laoder、url-loader 的文件：'C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\node_modules\\url-loader.js'
	 * @returns {void}
	 */
	/**
	 * files：可以是文件或目录。对于文件，跟踪内容和存在更改 | 对于目录，仅跟踪存在和时间戳更改
	 * dirs：仅目录、目录内容（和子目录的内容，…），跟踪存在更改。假设存在，当在没有进一步信息的情况下找不到目录时，将发出删除事件
	 * missing：可以是文件或目录，仅跟踪存在更改。预期不存在，最初未找到时不会发出删除事件。
	 * 					假如文件和目录存在，如果在没有进一步信息的情况下找不到它们，则会发出删除事件
	 * 					假如文件和目录不存在，不会未发出移除事件
	 */
	watch(files, dirs, missing) {
		this.pausedWatcher = null;
		/**
		 * 调用 compiler.watchFileSystem.watch 方法，实现对依赖文件(或目录)的监听
		 * 这个方法在 NodeWatchFileSystem 插件中集成 Node 的文件系统功能
		 */
		this.watcher = this.compiler.watchFileSystem.watch(
			files,
			dirs,
			missing,
			this.lastWatcherStartTime, // 最后一次 watch 开始时间 -- 也是表示构建这些资源时的时间，用于比较文件时间戳
			this.watchOptions, // 监听配置项
			// 这个回调触发时，表示需要重新构建
			(
				err,
				fileTimeInfoEntries,
				contextTimeInfoEntries,
				changedFiles,
				removedFiles
			) => {
				if (err) { // 如果出现错误的话
					this.compiler.modifiedFiles = undefined;
					this.compiler.removedFiles = undefined;
					this.compiler.fileTimestamps = undefined;
					this.compiler.contextTimestamps = undefined;
					this.compiler.fsStartTime = undefined;
					return this.handler(err);
				}
				this._invalidate(
					fileTimeInfoEntries,
					contextTimeInfoEntries,
					changedFiles,
					removedFiles
				);
				this._onChange();
			},
			// 这个方法只要监听文件发生第一个更改时触发(在重新构建之前只会触发一次？ -- 因为在 NodeWatchFileSystem.js 中是通过 once('change') 注册的事件，所以只触发一次)
			(fileName /** 更改的文件 */, changeTime /** 更改文件的上次修改时间 */) => {
				// 再一次构建周期中第一个更改的文件
				if (!this._invalidReported) {
					this._invalidReported = true;
					// 在一个观察中的 compilation 无效时执行 -- 此时 webpack-cli 会 logger 出更改信息
					this.compiler.hooks.invalid.call(fileName, changeTime);
				}
				this._onInvalid();
			}
		);
	}

	/**
	 * @param {Callback<void>=} callback signals when the build has completed again
	 * @returns {void}
	 */
	invalidate(callback) {
		if (callback) {
			this.callbacks.push(callback);
		}
		if (!this._invalidReported) {
			this._invalidReported = true;
			this.compiler.hooks.invalid.call(null, Date.now());
		}
		this._onChange();
		this._invalidate();
	}

	_invalidate(
		fileTimeInfoEntries,
		contextTimeInfoEntries,
		changedFiles,
		removedFiles
	) {
		if (this.suspended || (this._isBlocked() && (this.blocked = true))) {
			this._mergeWithCollected(changedFiles, removedFiles);
			return;
		}

		if (this.running) {
			this._mergeWithCollected(changedFiles, removedFiles);
			this.invalid = true;
		} else {
			this._go(
				fileTimeInfoEntries,
				contextTimeInfoEntries,
				changedFiles,
				removedFiles
			);
		}
	}

	suspend() {
		this.suspended = true;
	}

	resume() {
		if (this.suspended) {
			this.suspended = false;
			this._invalidate();
		}
	}

	/**
	 * @param {Callback<void>} callback signals when the watcher is closed
	 * @returns {void}
	 */
	close(callback) {
		if (this._closeCallbacks) {
			if (callback) {
				this._closeCallbacks.push(callback);
			}
			return;
		}
		const finalCallback = (err, compilation) => {
			this.running = false;
			this.compiler.running = false;
			this.compiler.watching = undefined;
			this.compiler.watchMode = false;
			this.compiler.modifiedFiles = undefined;
			this.compiler.removedFiles = undefined;
			this.compiler.fileTimestamps = undefined;
			this.compiler.contextTimestamps = undefined;
			this.compiler.fsStartTime = undefined;
			const shutdown = err => {
				this.compiler.hooks.watchClose.call();
				const closeCallbacks = this._closeCallbacks;
				this._closeCallbacks = undefined;
				for (const cb of closeCallbacks) cb(err);
			};
			if (compilation) {
				const logger = compilation.getLogger("webpack.Watching");
				logger.time("storeBuildDependencies");
				this.compiler.cache.storeBuildDependencies(
					compilation.buildDependencies,
					err2 => {
						logger.timeEnd("storeBuildDependencies");
						shutdown(err || err2);
					}
				);
			} else {
				shutdown(err);
			}
		};

		this.closed = true;
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}
		if (this.pausedWatcher) {
			this.pausedWatcher.close();
			this.pausedWatcher = null;
		}
		this._closeCallbacks = [];
		if (callback) {
			this._closeCallbacks.push(callback);
		}
		if (this.running) {
			this.invalid = true;
			this._done = finalCallback;
		} else {
			finalCallback();
		}
	}
}

module.exports = Watching;
