/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const parseJson = require('json-parse-better-errors');
const asyncLib = require('neo-async');
const {
  SyncHook,
  SyncBailHook,
  AsyncParallelHook,
  AsyncSeriesHook,
} = require('tapable');
const { SizeOnlySource } = require('webpack-sources');
const webpack = require('./');
const Cache = require('./Cache');
const CacheFacade = require('./CacheFacade');
const ChunkGraph = require('./ChunkGraph');
const Compilation = require('./Compilation');
const ConcurrentCompilationError = require('./ConcurrentCompilationError');
const ContextModuleFactory = require('./ContextModuleFactory');
const ModuleGraph = require('./ModuleGraph');
const NormalModuleFactory = require('./NormalModuleFactory');
const RequestShortener = require('./RequestShortener');
const ResolverFactory = require('./ResolverFactory');
const Stats = require('./Stats');
const Watching = require('./Watching');
const WebpackError = require('./WebpackError');
const { Logger } = require('./logging/Logger');
const { join, dirname, mkdirp } = require('./util/fs');
const { makePathsRelative } = require('./util/identifier');
const { isSourceEqual } = require('./util/source');

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("../declarations/WebpackOptions").OutputNormalized} OutputOptions */
/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./util/WeakTupleMap")} WeakTupleMap */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */
/** @typedef {import("./util/fs").WatchFileSystem} WatchFileSystem */

/**
 * @typedef {Object} CompilationParams
 * @property {NormalModuleFactory} normalModuleFactory
 * @property {ContextModuleFactory} contextModuleFactory
 */

/**
 * @template T
 * @callback Callback
 * @param {(Error | null)=} err
 * @param {T=} result
 */

/**
 * @callback RunAsChildCallback
 * @param {(Error | null)=} err
 * @param {Chunk[]=} entries
 * @param {Compilation=} compilation
 */

/**
 * @typedef {Object} AssetEmittedInfo
 * @property {Buffer} content
 * @property {Source} source
 * @property {Compilation} compilation
 * @property {string} outputPath
 * @property {string} targetPath
 */

/**
 * @param {string[]} array an array
 * @returns {boolean} true, if the array is sorted
 */
const isSorted = (array) => {
  for (let i = 1; i < array.length; i++) {
    if (array[i - 1] > array[i]) return false;
  }
  return true;
};

/**
 * @param {Object} obj an object
 * @param {string[]} keys the keys of the object
 * @returns {Object} the object with properties sorted by property name
 */
const sortObject = (obj, keys) => {
  const o = {};
  for (const k of keys.sort()) {
    o[k] = obj[k];
  }
  return o;
};

/**
 * @param {string} filename filename
 * @param {string | string[] | undefined} hashes list of hashes
 * @returns {boolean} true, if the filename contains any hash
 */
const includesHash = (filename, hashes) => {
  if (!hashes) return false;
  if (Array.isArray(hashes)) {
    return hashes.some((hash) => filename.includes(hash));
  } else {
    return filename.includes(hashes);
  }
};

class Compiler {
  /**
   * @param {string} context the compilation path
   * @param {WebpackOptions} options options
   */
  constructor(context, options = /** @type {WebpackOptions} */ ({})) {
    // Compiler 钩子
    this.hooks = Object.freeze({
      /** @type {SyncHook<[]>} */
      /**
      * initialize 钩子：当编译器对象被初始化时调用。
      * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
      */
      initialize: new SyncHook([]),

      /** @type {SyncBailHook<[Compilation], boolean>} */
      shouldEmit: new SyncBailHook(['compilation']),
      /** @type {AsyncSeriesHook<[Stats]>} */
      done: new AsyncSeriesHook(['stats']),
      /** @type {SyncHook<[Stats]>} */
      afterDone: new SyncHook(['stats']),
      /** @type {AsyncSeriesHook<[]>} */
      additionalPass: new AsyncSeriesHook([]),
      /**
       * beforeRun 钩子：在开始执行一次构建之前调用，compiler.run 方法开始执行后立刻进行调用。
       * AsyncSeriesHook 钩子：异步钩子，串联执行
       */
      /** @type {AsyncSeriesHook<[Compiler]>} */
      beforeRun: new AsyncSeriesHook(['compiler']),
      /**
       * run 钩子：在开始读取 records 之前调用。
       * AsyncSeriesHook 钩子：异步钩子，串联执行
       */
      /** @type {AsyncSeriesHook<[Compiler]>} */
      run: new AsyncSeriesHook(['compiler']),
      /** @type {AsyncSeriesHook<[Compilation]>} */
      emit: new AsyncSeriesHook(['compilation']),
      /** @type {AsyncSeriesHook<[string, AssetEmittedInfo]>} */
      assetEmitted: new AsyncSeriesHook(['file', 'info']),
      /** @type {AsyncSeriesHook<[Compilation]>} */
      afterEmit: new AsyncSeriesHook(['compilation']),

      /**
       * thisCompilation 钩子：初始化 compilation 时调用，在触发 compilation 事件之前调用。
       * SyncHook 钩子：同步串联执行
       */
      /** @type {SyncHook<[Compilation, CompilationParams]>} */
      thisCompilation: new SyncHook(['compilation', 'params']),
      /**
       * compilation 钩子：compilation 创建之后执行。
       * SyncHook 钩子：同步串联钩子
       */
      /** @type {SyncHook<[Compilation, CompilationParams]>} */
      compilation: new SyncHook(['compilation', 'params']),
      /** @type {SyncHook<[NormalModuleFactory]>} */
      /**
       * normalModuleFactory 钩子：NormalModuleFactory 创建之后调用。
       * SyncHook 钩子；同步，串联执行
       */
      normalModuleFactory: new SyncHook(['normalModuleFactory']),
      /** @type {SyncHook<[ContextModuleFactory]>}  */
      /**
       * contextModuleFactory 钩子：ContextModuleFactory 创建之后调用。
       * SyncHook 钩子；同步，串联执行
       */
      contextModuleFactory: new SyncHook(['contextModuleFactory']),

      /**
       * beforeCompile 钩子：在创建 compilation parameter 之后执行。
       * AsyncSeriesHook 钩子：异步串联执行
       */
      /** @type {AsyncSeriesHook<[CompilationParams]>} */
      beforeCompile: new AsyncSeriesHook(['params']),
      /**
       * compile 钩子：beforeCompile 之后立即调用，但在一个新的 compilation 创建之前。这个钩子 不会 被复制到子编译器。
       * SyncHook 钩子：同步串联执行
       */
      /** @type {SyncHook<[CompilationParams]>} */
      compile: new SyncHook(['params']),
      /** @type {AsyncParallelHook<[Compilation]>} */
      make: new AsyncParallelHook(['compilation']),
      /**
       * 模块构建完成
       * AsyncSeriesHook 钩子：异步串联执行
       */
      /** @type {AsyncParallelHook<[Compilation]>} */
      finishMake: new AsyncSeriesHook(['compilation']),
      /** @type {AsyncSeriesHook<[Compilation]>} */
      afterCompile: new AsyncSeriesHook(['compilation']),

      /** @type {AsyncSeriesHook<[]>} */
      readRecords: new AsyncSeriesHook([]),
      /** @type {AsyncSeriesHook<[]>} */
      emitRecords: new AsyncSeriesHook([]),

      /** @type {AsyncSeriesHook<[Compiler]>} */
      watchRun: new AsyncSeriesHook(['compiler']),
      /** @type {SyncHook<[Error]>} */
      failed: new SyncHook(['error']),
      /** @type {SyncHook<[string | null, number]>} */
      invalid: new SyncHook(['filename', 'changeTime']),
      /** @type {SyncHook<[]>} */
      watchClose: new SyncHook([]),
      /** @type {AsyncSeriesHook<[]>} */
      shutdown: new AsyncSeriesHook([]),

      /** @type {SyncBailHook<[string, string, any[]], true>} */
      infrastructureLog: new SyncBailHook(['origin', 'type', 'args']),

      // TODO the following hooks are weirdly located here 下面的钩子奇怪地位于这里
      // TODO move them for webpack 5 在webpack 5中移动它们
      /**
       * environment 钩子：在编译器准备环境时调用，时机就在配置文件中初始化插件之后。
       * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
       */
      /** @type {SyncHook<[]>} */
      environment: new SyncHook([]),
      /** @type {SyncHook<[]>} */
      afterEnvironment: new SyncHook([]),
      /** @type {SyncHook<[Compiler]>} */
      afterPlugins: new SyncHook(['compiler']),
      /** @type {SyncHook<[Compiler]>} */
      afterResolvers: new SyncHook(['compiler']),
      /** @type {SyncBailHook<[string, Entry], boolean>} */
      entryOption: new SyncBailHook(['context', 'entry']),
    });

    this.webpack = webpack; // webpack 方法

    /** @type {string=} 配置名称 - webpack.options.name */
    this.name = undefined; //  - https://webpack.docschina.org/configuration/other-options/#name
    /** @type {Compilation=} */
    this.parentCompilation = undefined;
    /** @type {Compiler} */
    this.root = this; // 根编译器 - 如果存在子编译器的话，就会指向根编译器，一般是本身
    /** @type {string} */
    this.outputPath = '';
    /** @type {Watching} */
    this.watching = undefined;

    /** @type {OutputFileSystem} */
    this.outputFileSystem = null;
    /** @type {IntermediateFileSystem} */
    this.intermediateFileSystem = null;
    /** @type {InputFileSystem} */
    this.inputFileSystem = null;
    /** @type {WatchFileSystem} */
    this.watchFileSystem = null;

    /** @type {string|null} */
    this.recordsInputPath = null;
    /** @type {string|null} */
    this.recordsOutputPath = null;
    this.records = {};
    /** @type {Set<string | RegExp>} */
    this.managedPaths = new Set(); // 由包管理器管理的路径数组，可以信任它不会被修改 -- https://webpack.docschina.org/configuration/other-options/#managedpaths
    /** @type {Set<string | RegExp>} */
    this.immutablePaths = new Set(); // 由包管理器管理的路径数组，在其路径中包含一个版本或哈希，以便所有文件都是不可变的（immutable） -- https://webpack.docschina.org/configuration/other-options/#immutable-paths

    /** @type {ReadonlySet<string>} */
    this.modifiedFiles = undefined;
    /** @type {ReadonlySet<string>} */
    this.removedFiles = undefined;
    /** @type {ReadonlyMap<string, FileSystemInfoEntry | "ignore" | null>} */
    this.fileTimestamps = undefined;
    /** @type {ReadonlyMap<string, FileSystemInfoEntry | "ignore" | null>} */
    this.contextTimestamps = undefined;
    /** @type {number} */
    this.fsStartTime = undefined;

    /** @type {ResolverFactory} */
    this.resolverFactory = new ResolverFactory();

    this.infrastructureLogger = undefined;

    this.options = options;

    this.context = context;

    this.requestShortener = new RequestShortener(context, this.root);

    this.cache = new Cache(); // Compiler 缓存类 -- 用来操作 Compiler 级别缓存 -- 缓存着各式各样的内容(模块实例。。。)

    /** @type {Map<Module, { buildInfo: object, references: WeakMap<Dependency, Module>, memCache: WeakTupleMap }> | undefined} */
    this.moduleMemCaches = undefined;

    this.compilerPath = ''; // 

    /** @type {boolean} 运行时标记 */
    this.running = false;

    /** @type {boolean} */
    this.idle = false; // Compiler 是否闲置标识

    /** @type {boolean} */
    this.watchMode = false;

    this._backCompat = this.options.experiments.backCompat !== false; // optinos.experiments.backCompat - 为许多 webpack 4 api 启用后向兼容层，并发出弃用警告。

    /** @type {Compilation} */
    this._lastCompilation = undefined; // 当前 Compiler 创建的 Compilation 实例 - 可能 Compiler 会被重用，此时就通过这个引用来做一些清除工作
    /** @type {NormalModuleFactory} */
    this._lastNormalModuleFactory = undefined; // 当前 Compiler 创建的 NormalModuleFactory 实例 - 可能 Compiler 会被重用，此时就通过这个引用来做一些清除工作

    /** @private @type {WeakMap<Source, { sizeOnlySource: SizeOnlySource, writtenTo: Map<string, number> }>} */
    this._assetEmittingSourceCache = new WeakMap();
    /** @private @type {Map<string, number>} */
    this._assetEmittingWrittenFiles = new Map();
    /** @private @type {Set<string>} */
    this._assetEmittingPreviousFiles = new Set();
  }

  /**
   * @param {string} name cache name
   * @returns {CacheFacade} the cache facade instance 缓存外观实例
   */
  getCache(name) {
    return new CacheFacade(
      this.cache,
      `${this.compilerPath}${name}`,
      this.options.output.hashFunction
    );
  }

  /**
   * @param {string | (function(): string)} name name of the logger, or function called once to get the logger name
   * @returns {Logger} a logger with that name
   */
  getInfrastructureLogger(name) {
    if (!name) {
      throw new TypeError(
        'Compiler.getInfrastructureLogger(name) called without a name'
      );
    }
    return new Logger(
      (type, args) => {
        if (typeof name === 'function') {
          name = name();
          if (!name) {
            throw new TypeError(
              'Compiler.getInfrastructureLogger(name) called with a function not returning a name'
            );
          }
        }
        if (this.hooks.infrastructureLog.call(name, type, args) === undefined) {
          if (this.infrastructureLogger !== undefined) {
            this.infrastructureLogger(name, type, args);
          }
        }
      },
      (childName) => {
        if (typeof name === 'function') {
          if (typeof childName === 'function') {
            return this.getInfrastructureLogger(() => {
              if (typeof name === 'function') {
                name = name();
                if (!name) {
                  throw new TypeError(
                    'Compiler.getInfrastructureLogger(name) called with a function not returning a name'
                  );
                }
              }
              if (typeof childName === 'function') {
                childName = childName();
                if (!childName) {
                  throw new TypeError(
                    'Logger.getChildLogger(name) called with a function not returning a name'
                  );
                }
              }
              return `${name}/${childName}`;
            });
          } else {
            return this.getInfrastructureLogger(() => {
              if (typeof name === 'function') {
                name = name();
                if (!name) {
                  throw new TypeError(
                    'Compiler.getInfrastructureLogger(name) called with a function not returning a name'
                  );
                }
              }
              return `${name}/${childName}`;
            });
          }
        } else {
          if (typeof childName === 'function') {
            return this.getInfrastructureLogger(() => {
              if (typeof childName === 'function') {
                childName = childName();
                if (!childName) {
                  throw new TypeError(
                    'Logger.getChildLogger(name) called with a function not returning a name'
                  );
                }
              }
              return `${name}/${childName}`;
            });
          } else {
            return this.getInfrastructureLogger(`${name}/${childName}`);
          }
        }
      }
    );
  }

  // TODO webpack 6: solve this in a better way 用更好的方法解决这个问题
  // e.g. move compilation specific info from Modules into ModuleGraph 将编译的特定信息从模块移到模块图中
  _cleanupLastCompilation() {
    // 将上一次编译的信息做清除
    if (this._lastCompilation !== undefined) {
      for (const module of this._lastCompilation.modules) {
        ChunkGraph.clearChunkGraphForModule(module);
        ModuleGraph.clearModuleGraphForModule(module);
        module.cleanupForCache();
      }
      for (const chunk of this._lastCompilation.chunks) {
        ChunkGraph.clearChunkGraphForChunk(chunk);
      }
      this._lastCompilation = undefined;
    }
  }

  // TODO webpack 6: solve this in a better way 用更好的方法解决这个问题
  _cleanupLastNormalModuleFactory() {
    if (this._lastNormalModuleFactory !== undefined) {
      this._lastNormalModuleFactory.cleanupForCache();
      this._lastNormalModuleFactory = undefined;
    }
  }

  /**
   * @param {WatchOptions} watchOptions the watcher's options
   * @param {Callback<Stats>} handler signals when the call finishes
   * @returns {Watching} a compiler watcher
   */
  watch(watchOptions, handler) {
    if (this.running) {
      return handler(new ConcurrentCompilationError());
    }

    this.running = true;
    this.watchMode = true;
    this.watching = new Watching(this, watchOptions, handler);
    return this.watching;
  }

  /**
   * 启动所有编译工作。 完成之后，执行传入的的 callback 函数。 最终记录下来的概括信息（stats）和错误（errors），都应在这个 callback 函数中获取。
   * @param {Callback<Stats>} callback signals when the call finishes 调用结束时发出的信号
   * @returns {void}
   */
  run(callback) {
    // 如果已经开始运行，则抛出错误
    if (this.running) {
      // 抛出错误：你运行了 Webpack 两次。每个实例一次只支持一个并发编译
      return callback(new ConcurrentCompilationError() /** 继承至 Error */);
    }

    let logger;

    const finalCallback = (err, stats) => {
      if (logger) logger.time('beginIdle');
      this.idle = true;
      this.cache.beginIdle();
      this.idle = true;
      if (logger) logger.timeEnd('beginIdle');
      this.running = false;
      if (err) {
        this.hooks.failed.call(err);
      }
      if (callback !== undefined) callback(err, stats);
      this.hooks.afterDone.call(stats);
    };

    const startTime = Date.now();

    this.running = true; // 运行标识置为 true

    const onCompiled = (err, compilation) => {
      if (err) return finalCallback(err);

      if (this.hooks.shouldEmit.call(compilation) === false) {
        compilation.startTime = startTime;
        compilation.endTime = Date.now();
        const stats = new Stats(compilation);
        this.hooks.done.callAsync(stats, (err) => {
          if (err) return finalCallback(err);
          return finalCallback(null, stats);
        });
        return;
      }

      process.nextTick(() => {
        logger = compilation.getLogger('webpack.Compiler');
        logger.time('emitAssets');
        this.emitAssets(compilation, (err) => {
          logger.timeEnd('emitAssets');
          if (err) return finalCallback(err);

          if (compilation.hooks.needAdditionalPass.call()) {
            compilation.needAdditionalPass = true;

            compilation.startTime = startTime;
            compilation.endTime = Date.now();
            logger.time('done hook');
            const stats = new Stats(compilation);
            this.hooks.done.callAsync(stats, (err) => {
              logger.timeEnd('done hook');
              if (err) return finalCallback(err);

              this.hooks.additionalPass.callAsync((err) => {
                if (err) return finalCallback(err);
                this.compile(onCompiled);
              });
            });
            return;
          }

          logger.time('emitRecords');
          this.emitRecords((err) => {
            logger.timeEnd('emitRecords');
            if (err) return finalCallback(err);

            compilation.startTime = startTime;
            compilation.endTime = Date.now();
            logger.time('done hook');
            const stats = new Stats(compilation);
            this.hooks.done.callAsync(stats, (err) => {
              logger.timeEnd('done hook');
              if (err) return finalCallback(err);
              this.cache.storeBuildDependencies(
                compilation.buildDependencies,
                (err) => {
                  if (err) return finalCallback(err);
                  return finalCallback(null, stats);
                }
              );
            });
          });
        });
      });
    };

    // 开始 Compiler 构建
    const run = () => {
      /**
       * beforeRun 钩子：在开始执行一次构建之前调用，compiler.run 方法开始执行后立刻进行调用。
       * AsyncSeriesHook 钩子：异步钩子，串联执行
       */
      this.hooks.beforeRun.callAsync(this, (err) => {
        // 构建失败，抛出错误交由 finalCallback 处理
        if (err) return finalCallback(err);

        /**
         * run 钩子：在开始读取 records 之前调用。
         * AsyncSeriesHook 钩子：异步钩子，串联执行
         */
        this.hooks.run.callAsync(this, (err) => {
          // 出现错误，抛出错误交由 finalCallback 处理
          if (err) return finalCallback(err);

          // records 是用来记录「用于存储跨多次构建(across multiple builds)的模块标识符」的数据片段 -- https://webpack.docschina.org/configuration/other-options/#recordsinputpath
          this.readRecords((err) => {
            // 出现错误，抛出错误
            if (err) return finalCallback(err);

            this.compile(onCompiled);
          });
        });
      });
    };

    if (this.idle) { 
      // 该 Compiler 当前状态为闲置时，再次启动时，需要通知 cache 编译器启动(cache 会在文件系统缓存时在编译器闲置时写入数据)
      this.cache.endIdle((err) => {
        if (err) return finalCallback(err);

        this.idle = false; // 表示 Compiler 开始运行，不再闲置
        run();
      });
    } else {
      run(); // 开始运行
    }
  }

  /**
   * @param {RunAsChildCallback} callback signals when the call finishes
   * @returns {void}
   */
  runAsChild(callback) {
    const startTime = Date.now();
    this.compile((err, compilation) => {
      if (err) return callback(err);

      this.parentCompilation.children.push(compilation);
      for (const { name, source, info } of compilation.getAssets()) {
        this.parentCompilation.emitAsset(name, source, info);
      }

      const entries = [];
      for (const ep of compilation.entrypoints.values()) {
        entries.push(...ep.chunks);
      }

      compilation.startTime = startTime;
      compilation.endTime = Date.now();

      return callback(null, entries, compilation);
    });
  }

  purgeInputFileSystem() {
    if (this.inputFileSystem && this.inputFileSystem.purge) {
      this.inputFileSystem.purge();
    }
  }

  /**
   * @param {Compilation} compilation the compilation
   * @param {Callback<void>} callback signals when the assets are emitted
   * @returns {void}
   */
  emitAssets(compilation, callback) {
    let outputPath;

    const emitFiles = (err) => {
      if (err) return callback(err);

      const assets = compilation.getAssets();
      compilation.assets = { ...compilation.assets };
      /** @type {Map<string, { path: string, source: Source, size: number, waiting: { cacheEntry: any, file: string }[] }>} */
      const caseInsensitiveMap = new Map();
      /** @type {Set<string>} */
      const allTargetPaths = new Set();
      asyncLib.forEachLimit(
        assets,
        15,
        ({ name: file, source, info }, callback) => {
          let targetFile = file;
          let immutable = info.immutable;
          const queryStringIdx = targetFile.indexOf('?');
          if (queryStringIdx >= 0) {
            targetFile = targetFile.substr(0, queryStringIdx);
            // We may remove the hash, which is in the query string
            // So we recheck if the file is immutable
            // This doesn't cover all cases, but immutable is only a performance optimization anyway
            immutable =
              immutable &&
              (includesHash(targetFile, info.contenthash) ||
                includesHash(targetFile, info.chunkhash) ||
                includesHash(targetFile, info.modulehash) ||
                includesHash(targetFile, info.fullhash));
          }

          const writeOut = (err) => {
            if (err) return callback(err);
            const targetPath = join(
              this.outputFileSystem,
              outputPath,
              targetFile
            );
            allTargetPaths.add(targetPath);

            // check if the target file has already been written by this Compiler
            const targetFileGeneration = this._assetEmittingWrittenFiles.get(
              targetPath
            );

            // create an cache entry for this Source if not already existing
            let cacheEntry = this._assetEmittingSourceCache.get(source);
            if (cacheEntry === undefined) {
              cacheEntry = {
                sizeOnlySource: undefined,
                writtenTo: new Map(),
              };
              this._assetEmittingSourceCache.set(source, cacheEntry);
            }

            let similarEntry;

            const checkSimilarFile = () => {
              const caseInsensitiveTargetPath = targetPath.toLowerCase();
              similarEntry = caseInsensitiveMap.get(caseInsensitiveTargetPath);
              if (similarEntry !== undefined) {
                const { path: other, source: otherSource } = similarEntry;
                if (isSourceEqual(otherSource, source)) {
                  // Size may or may not be available at this point.
                  // If it's not available add to "waiting" list and it will be updated once available
                  if (similarEntry.size !== undefined) {
                    updateWithReplacementSource(similarEntry.size);
                  } else {
                    if (!similarEntry.waiting) similarEntry.waiting = [];
                    similarEntry.waiting.push({ file, cacheEntry });
                  }
                  alreadyWritten();
                } else {
                  const err = new WebpackError(`Prevent writing to file that only differs in casing or query string from already written file.
This will lead to a race-condition and corrupted files on case-insensitive file systems.
${targetPath}
${other}`);
                  err.file = file;
                  callback(err);
                }
                return true;
              } else {
                caseInsensitiveMap.set(
                  caseInsensitiveTargetPath,
                  (similarEntry = {
                    path: targetPath,
                    source,
                    size: undefined,
                    waiting: undefined,
                  })
                );
                return false;
              }
            };

            /**
             * get the binary (Buffer) content from the Source
             * @returns {Buffer} content for the source
             */
            const getContent = () => {
              if (typeof source.buffer === 'function') {
                return source.buffer();
              } else {
                const bufferOrString = source.source();
                if (Buffer.isBuffer(bufferOrString)) {
                  return bufferOrString;
                } else {
                  return Buffer.from(bufferOrString, 'utf8');
                }
              }
            };

            const alreadyWritten = () => {
              // cache the information that the Source has been already been written to that location
              if (targetFileGeneration === undefined) {
                const newGeneration = 1;
                this._assetEmittingWrittenFiles.set(targetPath, newGeneration);
                cacheEntry.writtenTo.set(targetPath, newGeneration);
              } else {
                cacheEntry.writtenTo.set(targetPath, targetFileGeneration);
              }
              callback();
            };

            /**
             * Write the file to output file system
             * @param {Buffer} content content to be written
             * @returns {void}
             */
            const doWrite = (content) => {
              this.outputFileSystem.writeFile(targetPath, content, (err) => {
                if (err) return callback(err);

                // information marker that the asset has been emitted
                compilation.emittedAssets.add(file);

                // cache the information that the Source has been written to that location
                const newGeneration =
                  targetFileGeneration === undefined
                    ? 1
                    : targetFileGeneration + 1;
                cacheEntry.writtenTo.set(targetPath, newGeneration);
                this._assetEmittingWrittenFiles.set(targetPath, newGeneration);
                this.hooks.assetEmitted.callAsync(
                  file,
                  {
                    content,
                    source,
                    outputPath,
                    compilation,
                    targetPath,
                  },
                  callback
                );
              });
            };

            const updateWithReplacementSource = (size) => {
              updateFileWithReplacementSource(file, cacheEntry, size);
              similarEntry.size = size;
              if (similarEntry.waiting !== undefined) {
                for (const { file, cacheEntry } of similarEntry.waiting) {
                  updateFileWithReplacementSource(file, cacheEntry, size);
                }
              }
            };

            const updateFileWithReplacementSource = (
              file,
              cacheEntry,
              size
            ) => {
              // Create a replacement resource which only allows to ask for size
              // This allows to GC all memory allocated by the Source
              // (expect when the Source is stored in any other cache)
              if (!cacheEntry.sizeOnlySource) {
                cacheEntry.sizeOnlySource = new SizeOnlySource(size);
              }
              compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
                size,
              });
            };

            const processExistingFile = (stats) => {
              // skip emitting if it's already there and an immutable file
              if (immutable) {
                updateWithReplacementSource(stats.size);
                return alreadyWritten();
              }

              const content = getContent();

              updateWithReplacementSource(content.length);

              // if it exists and content on disk matches content
              // skip writing the same content again
              // (to keep mtime and don't trigger watchers)
              // for a fast negative match file size is compared first
              if (content.length === stats.size) {
                compilation.comparedForEmitAssets.add(file);
                return this.outputFileSystem.readFile(
                  targetPath,
                  (err, existingContent) => {
                    if (
                      err ||
                      !content.equals(/** @type {Buffer} */ (existingContent))
                    ) {
                      return doWrite(content);
                    } else {
                      return alreadyWritten();
                    }
                  }
                );
              }

              return doWrite(content);
            };

            const processMissingFile = () => {
              const content = getContent();

              updateWithReplacementSource(content.length);

              return doWrite(content);
            };

            // if the target file has already been written
            if (targetFileGeneration !== undefined) {
              // check if the Source has been written to this target file
              const writtenGeneration = cacheEntry.writtenTo.get(targetPath);
              if (writtenGeneration === targetFileGeneration) {
                // if yes, we may skip writing the file
                // if it's already there
                // (we assume one doesn't modify files while the Compiler is running, other then removing them)

                if (this._assetEmittingPreviousFiles.has(targetPath)) {
                  // We assume that assets from the last compilation say intact on disk (they are not removed)
                  compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
                    size: cacheEntry.sizeOnlySource.size(),
                  });

                  return callback();
                } else {
                  // Settings immutable will make it accept file content without comparing when file exist
                  immutable = true;
                }
              } else if (!immutable) {
                if (checkSimilarFile()) return;
                // We wrote to this file before which has very likely a different content
                // skip comparing and assume content is different for performance
                // This case happens often during watch mode.
                return processMissingFile();
              }
            }

            if (checkSimilarFile()) return;
            if (this.options.output.compareBeforeEmit) {
              this.outputFileSystem.stat(targetPath, (err, stats) => {
                const exists = !err && stats.isFile();

                if (exists) {
                  processExistingFile(stats);
                } else {
                  processMissingFile();
                }
              });
            } else {
              processMissingFile();
            }
          };

          if (targetFile.match(/\/|\\/)) {
            const fs = this.outputFileSystem;
            const dir = dirname(fs, join(fs, outputPath, targetFile));
            mkdirp(fs, dir, writeOut);
          } else {
            writeOut();
          }
        },
        (err) => {
          // Clear map to free up memory
          caseInsensitiveMap.clear();
          if (err) {
            this._assetEmittingPreviousFiles.clear();
            return callback(err);
          }

          this._assetEmittingPreviousFiles = allTargetPaths;

          this.hooks.afterEmit.callAsync(compilation, (err) => {
            if (err) return callback(err);

            return callback();
          });
        }
      );
    };

    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return callback(err);
      outputPath = compilation.getPath(this.outputPath, {});
      mkdirp(this.outputFileSystem, outputPath, emitFiles);
    });
  }

  /**
   * @param {Callback<void>} callback signals when the call finishes
   * @returns {void}
   */
  emitRecords(callback) {
    if (this.hooks.emitRecords.isUsed()) {
      if (this.recordsOutputPath) {
        asyncLib.parallel(
          [
            (cb) => this.hooks.emitRecords.callAsync(cb),
            this._emitRecords.bind(this),
          ],
          (err) => callback(err)
        );
      } else {
        this.hooks.emitRecords.callAsync(callback);
      }
    } else {
      if (this.recordsOutputPath) {
        this._emitRecords(callback);
      } else {
        callback();
      }
    }
  }

  /**
   * @param {Callback<void>} callback signals when the call finishes
   * @returns {void}
   */
  _emitRecords(callback) {
    const writeFile = () => {
      this.outputFileSystem.writeFile(
        this.recordsOutputPath,
        JSON.stringify(
          this.records,
          (n, value) => {
            if (
              typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value)
            ) {
              const keys = Object.keys(value);
              if (!isSorted(keys)) {
                return sortObject(value, keys);
              }
            }
            return value;
          },
          2
        ),
        callback
      );
    };

    const recordsOutputPathDirectory = dirname(
      this.outputFileSystem,
      this.recordsOutputPath
    );
    if (!recordsOutputPathDirectory) {
      return writeFile();
    }
    mkdirp(this.outputFileSystem, recordsOutputPathDirectory, (err) => {
      if (err) return callback(err);
      writeFile();
    });
  }

  /**
   * @param {Callback<void>} callback signals when the call finishes 调用结束时发出的信号
   * @returns {void}
   */
  readRecords(callback) {
    if (this.hooks.readRecords.isUsed() /** 应该是用来检测是否注册了这个钩子 */) {
      if (this.recordsInputPath) {
        asyncLib.parallel([
          (cb) => this.hooks.readRecords.callAsync(cb),
          this._readRecords.bind(this),
        ]);
      } else {
        this.records = {};
        this.hooks.readRecords.callAsync(callback);
      }
    } else {
      if (this.recordsInputPath) {
        this._readRecords(callback);
      } else {
        this.records = {};
        callback();
      }
    }
  }

  /**
   * @param {Callback<void>} callback signals when the call finishes 调用结束时发出的信号
   * @returns {void}
   */
  _readRecords(callback) {
    if (!this.recordsInputPath) {
      this.records = {};
      return callback();
    }
    this.inputFileSystem.stat(this.recordsInputPath, (err) => {
      // It doesn't exist
      // We can ignore this.
      if (err) return callback();

      this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
        if (err) return callback(err);

        try {
          this.records = parseJson(content.toString('utf-8'));
        } catch (e) {
          e.message = 'Cannot parse records: ' + e.message;
          return callback(e);
        }

        return callback();
      });
    });
  }

  /**
   * @param {Compilation} compilation the compilation
   * @param {string} compilerName the compiler's name
   * @param {number} compilerIndex the compiler's index
   * @param {OutputOptions=} outputOptions the output options
   * @param {WebpackPluginInstance[]=} plugins the plugins to apply
   * @returns {Compiler} a child compiler
   */
  createChildCompiler(
    compilation,
    compilerName,
    compilerIndex,
    outputOptions,
    plugins
  ) {
    const childCompiler = new Compiler(this.context, {
      ...this.options,
      output: {
        ...this.options.output,
        ...outputOptions,
      },
    });
    childCompiler.name = compilerName;
    childCompiler.outputPath = this.outputPath;
    childCompiler.inputFileSystem = this.inputFileSystem;
    childCompiler.outputFileSystem = null;
    childCompiler.resolverFactory = this.resolverFactory;
    childCompiler.modifiedFiles = this.modifiedFiles;
    childCompiler.removedFiles = this.removedFiles;
    childCompiler.fileTimestamps = this.fileTimestamps;
    childCompiler.contextTimestamps = this.contextTimestamps;
    childCompiler.fsStartTime = this.fsStartTime;
    childCompiler.cache = this.cache;
    childCompiler.compilerPath = `${this.compilerPath}${compilerName}|${compilerIndex}|`;
    childCompiler._backCompat = this._backCompat;

    const relativeCompilerName = makePathsRelative(
      this.context,
      compilerName,
      this.root
    );
    if (!this.records[relativeCompilerName]) {
      this.records[relativeCompilerName] = [];
    }
    if (this.records[relativeCompilerName][compilerIndex]) {
      childCompiler.records = this.records[relativeCompilerName][compilerIndex];
    } else {
      this.records[relativeCompilerName].push((childCompiler.records = {}));
    }

    childCompiler.parentCompilation = compilation;
    childCompiler.root = this.root;
    if (Array.isArray(plugins)) {
      for (const plugin of plugins) {
        plugin.apply(childCompiler);
      }
    }
    for (const name in this.hooks) {
      if (
        ![
          'make',
          'compile',
          'emit',
          'afterEmit',
          'invalid',
          'done',
          'thisCompilation',
        ].includes(name)
      ) {
        if (childCompiler.hooks[name]) {
          childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
        }
      }
    }

    compilation.hooks.childCompiler.call(
      childCompiler,
      compilerName,
      compilerIndex
    );

    return childCompiler;
  }

  isChild() {
    return !!this.parentCompilation;
  }

  // 实例化 Compilation，实例化过程中只做了初始化属性，不做具体工作
  createCompilation(params) {
    this._cleanupLastCompilation(); // 
    // 实例化 Compilation，实例化过程中只做了初始化属性，不做具体工作
    return (this._lastCompilation = new Compilation(this, params));
  }

  /**
   * @param {CompilationParams} params the compilation parameters 编译参数
   * @returns {Compilation} the created compilation 创建的 compilation
   */
	newCompilation(params) {
		// 实例化 compilation 
    const compilation = this.createCompilation(params);
    compilation.name = this.name; // 当前 Compilation 的 name，由 webpack.options.name 配置
		compilation.records = this.records;
    /**
     * thisCompilation 钩子：初始化 compilation 时调用，在触发 compilation 事件之前调用。
     * SyncHook 钩子：同步串联执行
     * webpack 内部注册了很多钩子事件
     */
		this.hooks.thisCompilation.call(compilation, params);
    /**
     * compilation 钩子：compilation 创建之后执行。
     * SyncHook 钩子：同步串联钩子
     * webpack 内部注册了很多钩子事件
     */
    this.hooks.compilation.call(compilation, params);
    return compilation;
  }

  /**
   * 创建 NormalModuleFactory 实例：
   *  从入口点开始，此模块会分解每个请求，解析文件内容以查找进一步的请求，然后通过分解所有请求以及解析新的文件来爬取全部文件。
   *  在最后阶段，每个依赖项都会成为一个模块实例。
   */
  createNormalModuleFactory() {
    this._cleanupLastNormalModuleFactory(); // 清理旧的 NormalModuleFactory 实例
    // 创建一个模块工厂实例
    const normalModuleFactory = new NormalModuleFactory({
      context: this.options.context, // webpack.options.contxt：路径上下文
      fs: this.inputFileSystem, // 读取文件系统 - 封装 Node 的 fs 模块
      resolverFactory: this.resolverFactory,
      options: this.options.module, // webpack.options.module 配置项(用户配置和默认配置相结合) - 用来处理模块的配置
      associatedObjectForCache: this.root, // 根编译器
      layers: this.options.experiments.layers, // 在 webpack5 中还是实验特性
    });
    this._lastNormalModuleFactory = normalModuleFactory; // 当前 Compiler 的 NormalModuleFactory 实例
    /**
     * normalModuleFactory 钩子：NormalModuleFactory 创建之后调用。
     * SyncHook 钩子；同步，串联执行
     */
    this.hooks.normalModuleFactory.call(normalModuleFactory);
    return normalModuleFactory; // 返回模块工厂实例 - 用来为每个模块创建模块实例
  }

  /**
   * 创建 ContextModuleFactory 实例：
   *  从 webpack 独特的 require.context API 生成依赖关系。它会解析请求的目录，为每个文件生成请求，并依据传递来的 regExp 进行过滤。
   *  最后匹配成功的依赖关系将被传入 NormalModuleFactory。
   */
  createContextModuleFactory() {
    const contextModuleFactory = new ContextModuleFactory(this.resolverFactory);
    /**
     * contextModuleFactory 钩子：ContextModuleFactory 创建之后调用。
     * SyncHook 钩子；同步，串联执行
     */
    this.hooks.contextModuleFactory.call(contextModuleFactory);
    return contextModuleFactory;
  }

  // 创建 Compilation 需要的参数
  newCompilationParams() {
    const params = {
      normalModuleFactory: this.createNormalModuleFactory(), // 初始化 NormalModuleFactory 实例 - 用来为每个模块创建模块实例
      contextModuleFactory: this.createContextModuleFactory(), // 初始化 ContextModuleFactory 实例 - 从 webpack 独特的 require.context API 生成依赖关系
    };
    return params;
  }

  /**
   * 初始化 compilation，并启动 compilation 开始构建
   * @param {Callback<Compilation>} callback signals when the compilation finishes 编译完成时发出信号
   * @returns {void}
   */
  compile(callback) {
    /**
     * 初始化 Compilation 时的参数:
     * 	1. NormalModuleFactory: 生成各类模块。从入口点开始，此模块会分解每个请求，解析文件内容以查找进一步的请求，然后通过分解所有请求以及解析新的文件来爬取全部文件。在最后阶段，每个依赖项都会成为一个模块实例。
     *  2. ContextModuleFactory: 解析请求的目录，为每个文件生成请求，并依据传递来的 regExp 进行过滤。最后匹配成功的依赖关系将被传入 NormalModuleFactory
     */
    const params = this.newCompilationParams();
    /**
     * beforeCompile 钩子：在创建 compilation parameter 之后执行。
     * AsyncSeriesHook 钩子：异步串联执行
     */
    this.hooks.beforeCompile.callAsync(params, (err) => {
      // 发生错误时，直接结束编译
      if (err) return callback(err);

      /**
       * compile 钩子：beforeCompile 之后立即调用，但在一个新的 compilation 创建之前。这个钩子 不会 被复制到子编译器。
       * SyncHook 钩子：同步串联执行
       */
      this.hooks.compile.call(params);

      /**
       * 创建一个 Compilation 实例，并执行了 thisCompilation 和 compilation 钩子
       */
      const compilation = this.newCompilation(params);

      const logger = compilation.getLogger('webpack.Compiler');

			logger.time('make hook');
			// compilation 结束之前执行 -- 在 ./EntryPlugin.js 内部中注册了这个钩子，用于处理程序的入口
      /**
       * make 钩子：compilation 结束之前执行。
       * AsyncParallelHook 钩子：异步并行钩子，会并发执行所有异步钩子
       * 
       * 在 ./EntryPlugin.js 内部中注册了这个钩子，用于处理 entry 的启动构建
       * 在这个插件内部，会通过调用 compilation.addEntry 方法启动 entry 的构建 --> 值得注意的是，会并行构建每个入口(还会遍历 entry.import)，见 ./EntryOptionPlugin.js 插件
       * 在之后，控制权就交由 compilation，开启对程序的模块进行编译、优化、分块等等操作
       */
      this.hooks.make.callAsync(compilation, (err) => {
        /**
         * 从入口开始，所有的模块都已经编译好了
         */
        logger.timeEnd('make hook');
        if (err) return callback(err); // 编译过程出现错误，抛出错误

        logger.time('finish make hook');
        /**
         * 模块构建完成钩子
         */
        this.hooks.finishMake.callAsync(compilation, (err) => {
          logger.timeEnd('finish make hook');
          if (err) return callback(err);

          // 类似于 Promise，在微任务中执行
          process.nextTick(() => {
            logger.time('finish compilation');
            /**
	           * 在所有模块构建完成后从模块中提取一些信息
             *  例如：遍历所有 module 将 export 出来的变量以数组的形式，单独存储到 module.buildMeta.providedExports变量下。
	           * 			 遍历所有 module 将错误和警告信息提取出来等等
	           */
            compilation.finish((err) => {
              logger.timeEnd('finish compilation');
              if (err) return callback(err); // 存在错误，抛出错误

              logger.time('seal compilation');
              compilation.seal((err) => {
                logger.timeEnd('seal compilation');
                if (err) return callback(err);

                logger.time('afterCompile hook');
                this.hooks.afterCompile.callAsync(compilation, (err) => {
                  logger.timeEnd('afterCompile hook');
                  if (err) return callback(err);

                  return callback(null, compilation);
                });
              });
            });
          });
        });
      });
    });
  }

  /**
   * @param {Callback<void>} callback signals when the compiler closes 当编译器关闭时发出信号
   * @returns {void}
   */
  close(callback) {
    if (this.watching) {
      // When there is still an active watching, close this first
      this.watching.close((err) => {
        this.close(callback);
      });
      return;
    }
    this.hooks.shutdown.callAsync((err) => {
      if (err) return callback(err);
      // Get rid of reference to last compilation to avoid leaking memory
      // We can't run this._cleanupLastCompilation() as the Stats to this compilation
      // might be still in use. We try to get rid of the reference to the cache instead.
      this._lastCompilation = undefined;
      this._lastNormalModuleFactory = undefined;
      this.cache.shutdown(callback);
    });
  }
}

module.exports = Compiler;
