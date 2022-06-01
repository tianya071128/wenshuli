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
		this.startTime = null; // 构建资源开始时间
		this.invalid = false; // 该次编译失效标识 -- 在编译阶段(this._go())中会判断该标识，如果为 true，那么
		this.handler = handler; // 每次构建资源成功后回调
		/** @type {Callback<void>[]} */
		this.callbacks = []; // 再次构建完成后的回调(调用 invalidate() 时会使用当前构建失效)
		/** @type {Callback<void>[] | undefined} */
		this._closeCallbacks = undefined;
		this.closed = false; // 监听结束标识
		this.suspended = false; // 监听暂停标识
		this.blocked = false;
		this._isBlocked = () => false;
		this._onChange = () => {}; // 文件发生变更需要重新编译后的回调
		this._onInvalid = () => { }; // 检测到文件第一个更改时的回调
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
		this.running = false; // 资源构建标识 -- 在一次监听中，如果构建完成就会重置为 false，在构建的过程中的话就会 true
		this._initial = true; // 初始标识
		this._invalidReported = true; // 
		this._needRecords = true;
		this.watcher = undefined; // 监听系统类，可以用来操作监听系统，如关闭监听、暂停监听等
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
	 * @param {ReadonlySet<string>} changedFiles changed files 变化的文件列表
	 * @param {ReadonlySet<string>} removedFiles removed files 删除的文件列表
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
		if (this.startTime === null) this.startTime = Date.now(); // 构建资源开始时间
		this.running = true; // 构建流程开始
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
		this.compiler.modifiedFiles = this._collectedChangedFiles; // 编译循环期间，编译变更的文件
		this._collectedChangedFiles = undefined;
		this.compiler.removedFiles = this._collectedRemovedFiles; // 编译循环期间，被删除的文件
		this._collectedRemovedFiles = undefined;

		const run = () => {
			// 如果编译器在闲置状态时，那么就通知 cache 缓存机制进行缓存操作
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
			this.invalid = false; // 开始编译，就不会编译失效了
			this._invalidReported = false;
			/**
			 * watchRun：在监听模式下，一个新的 compilation 触发之后，但在 compilation 实际开始之前执行 -- 异步串联执行
			 */
			this.compiler.hooks.watchRun.callAsync(this.compiler, err => {
				if (err) return this._done(err); // 错误，交给 _done 处理错误
				// 此时，chunks 都已经构建完成，但是还没有发送文件
				const onCompiled = (err, compilation) => {
					if (err) return this._done(err, compilation); // 错误，交给 _done 处理错误
					// 如果在编译期间，invalid 标识为 ture 的话，表示将这此编译失效，那么不将资源输出到 output 目录，但是还是需要 watch 监听文件变化
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
							// 与上面的同理
							if (this.invalid) return this._done(null, compilation);

							logger.time("emitRecords");
							this.compiler.emitRecords(err => {
								logger.timeEnd("emitRecords");
								if (err) return this._done(err, compilation);
								// needAdditionalPass：调用以决定 asset 在输出后是否需要进一步处理。
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

		// 构建资源过程时出现错误处理方法
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

		/**
		 * 这里似乎是，如果当前编译无效的话，那么就重新编译一下
		 * 可能是因为在重新编译时间过长，在这次编译中又有文件变更，那么就直接中断编译而重新编译一下
		 */
		if (
			this.invalid && // 当前编译无效
			!this.suspended && // 监听状态中
			!this.blocked && // 。。。
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
			compilation.startTime = this.startTime; // 资源构建开始时间
			compilation.endTime = Date.now(); // 资源构建结束时间
			stats = new Stats(compilation); // 封装 compilation 信息
		}
		this.startTime = null; // 资源构建完成，构建开始时间重置
		if (err) return handleError(err); // 在构建过程中出现错误的话，就交给 handleError 处理

		const cbs = this.callbacks; // 提取出资源构建完成后回调
		this.callbacks = []; // 重置
		logger.time("done hook");
		/** 
		 * 在 compilation 完成时执行，资源构建完成 -- 异步串联执行
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
					this.compiler.cache.beginIdle(); // 通知缓存开始闲置 -- 可以进行缓存资源的保存
					this.compiler.idle = true; // 编译器闲置标识
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
					for (const cb of cbs) cb(null); // 在编译流程全部完成后执行构建完成回调
					this.compiler.hooks.afterDone.call(stats); // 资源构建完成后钩子
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
			// 这个回调触发时，表示需要重新构建，这个回调触发后，只会执行一次，然后重新构建资源，构建完成后重新调用 watch 方法启动监听
			(
				err,
				fileTimeInfoEntries,
				contextTimeInfoEntries,
				changedFiles, // 发生变化的文件列表
				removedFiles // 删除的文件列表
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
	 * @param {Callback<void>=} callback signals when the build has completed again 再次完成构建时发出信号
	 * @returns {void}
	 */
	/**
	 * 使当前编译循环（compiling round）无效， 而不会停止监听进程（process）：
	 */
	invalidate(callback) {
		if (callback) {
			// 如果传递了回调进来，就需要先缓存好回调(再次完成构建时回调)
			this.callbacks.push(callback);
		}
		// 这个标识似乎就是判断 compiler.hooks.invalid 钩子的执行
		if (!this._invalidReported) {
			this._invalidReported = true;
			// 在一个观察中的 compilation 无效时执行。
			this.compiler.hooks.invalid.call(null, Date.now());
		}
		this._onChange(); // 。。。
		/**
		 * 在编译阶段重新触发监听流程的话，就会使得当前编译失效，详见 _invalidate 方法注释
		 */
		this._invalidate();
	}
								
	/**
	 * 实现 watch 模式的步骤：
	 * 	-> 启动该方法(this._invalidate())
	 * 	-> this._go 方法：方法内部调用 this.compiler 实现资源的编译并输出到目标目录中
	 * 	-> 编译完成后，调用 this._done 方法：处理一些编译后的处理，最后调用 this.watch 方法
	 * 	-> this.watch 方法中：会对 compilation 编译期间收集到的监听列表进行监听：
	 * 			compilation.fileDependencies：可以是文件或目录。对于文件，跟踪内容和存在更改 | 对于目录，仅跟踪存在和时间戳更改
	 * 			compilation.contextDependencies：仅目录、目录内容（和子目录的内容，…），跟踪存在更改。假设存在，当在没有进一步信息的情况下找不到目录时，将发出删除事件
	 * 			compilation.missingDependencies：可以是文件或目录，仅跟踪存在更改。预期不存在，最初未找到时不会发出删除事件。
	 * 																			 假如文件和目录存在，如果在没有进一步信息的情况下找不到它们，则会发出删除事件
	 * 																			 假如文件和目录不存在，不会未发出移除事件
	 * 			--> 在 this.watch 方法内部中调用 this.compiler.watchFileSystem.watch 实现对上述文件的监听，会在文件发生变更时和需要重新编译时两个时机发出事件，从而实现重新编译
	 * 	
	 * 监听到文件变化，触发重新编译：
	 * 	-> 监听到文件变化后，会触发 this.watch 方法中的回调，这个监听系统中做了处理，当需要重新构建后，就会暂停发出监听事件
	 * 			--> 也就是说，在重新编译期间，如果重新变更了文件，是不会中断这个编译的(会在重新监听时，监听系统就会知道重新变更了文件，从而触发重新编译)
	 * 	-> 在 this.watch 方法重新构建回调中，会触发该方法(this._invalidate) -> 启动 this._go 方法进行资源编译 -> 启动 this._done 方法处理编译后的处理 -> 启动 this.watch 方法，实现对文件的重新监听
	 * 	-> 重新构建过程中，如下参数的作用：
	 * 			--> fileTimeInfoEntries：。。。
	 * 			--> contextTimeInfoEntries：。。。
	 * 			--> changedFiles：发生变更的文件列表，最终会赋值到 this.compiler.modifiedFiles 属性中
	 * 			--> removedFiles：删除文件列表，最终会赋值到 this.compiler.removedFiles 属性中
	 * 			--> 但是最终作用未知，应该不是只重新编译这几个文件，因为内部会有缓存，重新编译也是很快的
	 * 			
	 * 在重新编译期间，又发生了文件变更：
	 * 	-> 在这种情况下，不会响应文件变更，也就不会中断这次的编译，但是会在重新编译完成后调用 this.watch 方法执行监听操作时
	 * 	-> 监听系统就会发现文件在重新编译期间发生了变更(可能是通过 this.lastWatcherStartTime 时间来判断)，就会触发重新编译构建
	 * 
	 * 其他情况：
	 * 	使当前编译循环（compiling round）无效， 而不会停止监听进程：
	 * 		-> 调用 this.invalidate 方法，从而在编译期间重新调用 _invalidate 方法
	 * 		-> 在该方法内部(_invalidate)，会判断 this.running 标识，如果为 true 的话，表示在编译中，此时就将 this.invalid 标识置为 true
	 * 		-> 最终实现当前编译失效的关键在于将 invalid 标识置为 true，这样在编译阶段中，会判断该标识是否为 true，如果是的话，那么就不会继续编译，但是还是会重新调用 this.watch 方法进行文件监听
	 *  暂停监听：
	 * 		-> 在 this.suspend 方法中，将 suspended 标识置为 true
	 * 		-> 在该方法内部(_invalidate)，如果判断 suspended 标识为 true 的话，就不会继续进行监听文件
	 *  重新开始监听：
	 * 		-> 在 this.resume 方法中，如果是暂停监听状态，那么就将 suspended 标识置为 false，并且调用 _invalidate 方法重新启动监听
	 *  关闭监听：见 this.close 方法
	 */
	_invalidate(
		fileTimeInfoEntries,
		contextTimeInfoEntries,
		changedFiles, // 变化的文件列表
		removedFiles // 删除的文件列表
	) {
		if (this.suspended /** 暂停监听 */ || (this._isBlocked() && (this.blocked = true))) {
			// 此时就不会继续往下执行，也就不会继续监听文件了
			this._mergeWithCollected(changedFiles, removedFiles);
			return;
		}

		if (this.running /** 编译标识 */) {
			// 在编译期间重新调用该方法，就会使得该编译期间失效
			this._mergeWithCollected(changedFiles, removedFiles);
			/**
			 * 最终实现当前编译失效的关键在于将 invalid 标识置为 true，
			 * 这样在编译阶段中，会判断该标识是否为 true，如果是的话，那么就不会继续编译，但是还是会重新调用 this.watch 方法进行文件监听
			 */
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

	/**
	 * 暂停监听：逻辑比较简单，将 suspended 标识置为 true，后续在通过 _invalidate 方法启动监听时，就会将其阻断监听
	 */
	suspend() {
		this.suspended = true;
	}

	/**
	 * 继续监听：逻辑也比较简单，如果是暂停状态，那么将 suspended 标识置为 false，并且调用 _invalidate 方法重新启动监听
	 */
	resume() {
		if (this.suspended) {
			this.suspended = false;
			this._invalidate();
		}
	}

	/**
	 * @param {Callback<void>} callback signals when the watcher is closed 当监视器关闭时发出信号
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
