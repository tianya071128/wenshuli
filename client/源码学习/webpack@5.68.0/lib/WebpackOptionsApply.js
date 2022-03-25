/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

const OptionsApply = require('./OptionsApply');

const AssetModulesPlugin = require('./asset/AssetModulesPlugin');
const JavascriptModulesPlugin = require('./javascript/JavascriptModulesPlugin');
const JsonModulesPlugin = require('./json/JsonModulesPlugin');

const ChunkPrefetchPreloadPlugin = require('./prefetch/ChunkPrefetchPreloadPlugin');

const EntryOptionPlugin = require('./EntryOptionPlugin');
const RecordIdsPlugin = require('./RecordIdsPlugin');

const RuntimePlugin = require('./RuntimePlugin');

const APIPlugin = require('./APIPlugin');
const CompatibilityPlugin = require('./CompatibilityPlugin');
const ConstPlugin = require('./ConstPlugin');
const ExportsInfoApiPlugin = require('./ExportsInfoApiPlugin');
const WebpackIsIncludedPlugin = require('./WebpackIsIncludedPlugin');

const TemplatedPathPlugin = require('./TemplatedPathPlugin');
const UseStrictPlugin = require('./UseStrictPlugin');
const WarnCaseSensitiveModulesPlugin = require('./WarnCaseSensitiveModulesPlugin');

const DataUriPlugin = require('./schemes/DataUriPlugin');
const FileUriPlugin = require('./schemes/FileUriPlugin');

const ResolverCachePlugin = require('./cache/ResolverCachePlugin');

const CommonJsPlugin = require('./dependencies/CommonJsPlugin');
const HarmonyModulesPlugin = require('./dependencies/HarmonyModulesPlugin');
const ImportMetaPlugin = require('./dependencies/ImportMetaPlugin');
const ImportPlugin = require('./dependencies/ImportPlugin');
const LoaderPlugin = require('./dependencies/LoaderPlugin');
const RequireContextPlugin = require('./dependencies/RequireContextPlugin');
const RequireEnsurePlugin = require('./dependencies/RequireEnsurePlugin');
const RequireIncludePlugin = require('./dependencies/RequireIncludePlugin');
const SystemPlugin = require('./dependencies/SystemPlugin');
const URLPlugin = require('./dependencies/URLPlugin');
const WorkerPlugin = require('./dependencies/WorkerPlugin');

const InferAsyncModulesPlugin = require('./async-modules/InferAsyncModulesPlugin');

const JavascriptMetaInfoPlugin = require('./JavascriptMetaInfoPlugin');
const DefaultStatsFactoryPlugin = require('./stats/DefaultStatsFactoryPlugin');
const DefaultStatsPresetPlugin = require('./stats/DefaultStatsPresetPlugin');
const DefaultStatsPrinterPlugin = require('./stats/DefaultStatsPrinterPlugin');

const { cleverMerge } = require('./util/cleverMerge');

/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Compiler")} Compiler */
class WebpackOptionsApply extends OptionsApply {
  constructor() {
    super();
  }

  /**
   * 主要做了如下工作：
   *  1. 根据配置项注册内部插件
   *  2. 执行 Compiler.hooks.entryOption 钩子
   *       内部插件注册了这个钩子，用于处理 entry
   *  3. 执行 Compiler.hooks.afterPlugins 钩子
   *  4. 执行 Compiler.hooks.afterResolvers 钩子
   * @param {WebpackOptions} options options object 配置项
   * @param {Compiler} compiler compiler object
   * @returns {WebpackOptions} options object
   */
  process(options, compiler) {
    compiler.outputPath = options.output.path; // 输出目录
    compiler.recordsInputPath = options.recordsInputPath || null; // 指定读取最后一条记录的文件的名称。
    compiler.recordsOutputPath = options.recordsOutputPath || null; // 指定记录要写入的位置。
    compiler.name = options.name; // 配置名称 - https://webpack.docschina.org/configuration/other-options/#name

    // _mark-externals -- (外部扩展)实现插件
    if (options.externals) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ExternalsPlugin = require('./ExternalsPlugin');
      new ExternalsPlugin(options.externalsType, options.externals).apply(
        compiler
      );
    }

    // _mark-externalsPresets -- 为特定的 target 启用 externals 的 preset。
    if (options.externalsPresets.node) {
      const NodeTargetPlugin = require('./node/NodeTargetPlugin');
      new NodeTargetPlugin().apply(compiler);
    }
    if (options.externalsPresets.electronMain) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ElectronTargetPlugin = require('./electron/ElectronTargetPlugin');
      new ElectronTargetPlugin('main').apply(compiler);
    }
    if (options.externalsPresets.electronPreload) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ElectronTargetPlugin = require('./electron/ElectronTargetPlugin');
      new ElectronTargetPlugin('preload').apply(compiler);
    }
    if (options.externalsPresets.electronRenderer) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ElectronTargetPlugin = require('./electron/ElectronTargetPlugin');
      new ElectronTargetPlugin('renderer').apply(compiler);
    }
    if (
      options.externalsPresets.electron &&
      !options.externalsPresets.electronMain &&
      !options.externalsPresets.electronPreload &&
      !options.externalsPresets.electronRenderer
    ) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ElectronTargetPlugin = require('./electron/ElectronTargetPlugin');
      new ElectronTargetPlugin().apply(compiler);
    }
    if (options.externalsPresets.nwjs) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ExternalsPlugin = require('./ExternalsPlugin');
      new ExternalsPlugin('node-commonjs', 'nw.gui').apply(compiler);
    }
    if (options.externalsPresets.webAsync) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ExternalsPlugin = require('./ExternalsPlugin');
      new ExternalsPlugin(
        'import',
        options.experiments.css
          ? ({ request, dependencyType }, callback) => {
              if (dependencyType === 'url') {
                if (/^(\/\/|https?:\/\/)/.test(request))
                  return callback(null, `asset ${request}`);
              } else if (dependencyType === 'css-import') {
                if (/^(\/\/|https?:\/\/)/.test(request))
                  return callback(null, `css-import ${request}`);
              } else if (/^(\/\/|https?:\/\/|std:)/.test(request)) {
                if (/^\.css(\?|$)/.test(request))
                  return callback(null, `css-import ${request}`);
                return callback(null, `import ${request}`);
              }
              callback();
            }
          : /^(\/\/|https?:\/\/|std:)/
      ).apply(compiler);
    } else if (options.externalsPresets.web) {
      //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
      const ExternalsPlugin = require('./ExternalsPlugin');
      new ExternalsPlugin(
        'module',
        options.experiments.css
          ? ({ request, dependencyType }, callback) => {
              if (dependencyType === 'url') {
                if (/^(\/\/|https?:\/\/)/.test(request))
                  return callback(null, `asset ${request}`);
              } else if (dependencyType === 'css-import') {
                if (/^(\/\/|https?:\/\/)/.test(request))
                  return callback(null, `css-import ${request}`);
              } else if (/^(\/\/|https?:\/\/|std:)/.test(request)) {
                if (/^\.css(\?|$)/.test(request))
                  return callback(null, `css-import ${request}`);
                return callback(null, `module ${request}`);
              }
              callback();
            }
          : /^(\/\/|https?:\/\/|std:)/
      ).apply(compiler);
    }

    new ChunkPrefetchPreloadPlugin().apply(compiler);

    if (typeof options.output.chunkFormat === 'string') {
      switch (options.output.chunkFormat) {
        case 'array-push': {
          const ArrayPushCallbackChunkFormatPlugin = require('./javascript/ArrayPushCallbackChunkFormatPlugin');
          new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
          break;
        }
        case 'commonjs': {
          const CommonJsChunkFormatPlugin = require('./javascript/CommonJsChunkFormatPlugin');
          new CommonJsChunkFormatPlugin().apply(compiler);
          break;
        }
        case 'module': {
          const ModuleChunkFormatPlugin = require('./esm/ModuleChunkFormatPlugin');
          new ModuleChunkFormatPlugin().apply(compiler);
          break;
        }
        default:
          throw new Error(
            "Unsupported chunk format '" + options.output.chunkFormat + "'."
          );
      }
    }

    if (options.output.enabledChunkLoadingTypes.length > 0) {
      for (const type of options.output.enabledChunkLoadingTypes) {
        const EnableChunkLoadingPlugin = require('./javascript/EnableChunkLoadingPlugin');
        new EnableChunkLoadingPlugin(type).apply(compiler);
      }
    }

    if (options.output.enabledWasmLoadingTypes.length > 0) {
      for (const type of options.output.enabledWasmLoadingTypes) {
        const EnableWasmLoadingPlugin = require('./wasm/EnableWasmLoadingPlugin');
        new EnableWasmLoadingPlugin(type).apply(compiler);
      }
    }

    if (options.output.enabledLibraryTypes.length > 0) {
      for (const type of options.output.enabledLibraryTypes) {
        const EnableLibraryPlugin = require('./library/EnableLibraryPlugin');
        new EnableLibraryPlugin(type).apply(compiler);
      }
    }

    if (options.output.pathinfo) {
      const ModuleInfoHeaderPlugin = require('./ModuleInfoHeaderPlugin');
      new ModuleInfoHeaderPlugin(options.output.pathinfo !== true).apply(
        compiler
      );
    }

    if (options.output.clean) {
      const CleanPlugin = require('./CleanPlugin');
      new CleanPlugin(
        options.output.clean === true ? {} : options.output.clean
      ).apply(compiler);
    }

    if (options.devtool) {
      if (options.devtool.includes('source-map')) {
        const hidden = options.devtool.includes('hidden');
        const inline = options.devtool.includes('inline');
        const evalWrapped = options.devtool.includes('eval');
        const cheap = options.devtool.includes('cheap');
        const moduleMaps = options.devtool.includes('module');
        const noSources = options.devtool.includes('nosources');
        const Plugin = evalWrapped
          ? require('./EvalSourceMapDevToolPlugin')
          : require('./SourceMapDevToolPlugin');
        new Plugin({
          filename: inline ? null : options.output.sourceMapFilename,
          moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
          fallbackModuleFilenameTemplate:
            options.output.devtoolFallbackModuleFilenameTemplate,
          append: hidden ? false : undefined,
          module: moduleMaps ? true : cheap ? false : true,
          columns: cheap ? false : true,
          noSources: noSources,
          namespace: options.output.devtoolNamespace,
        }).apply(compiler);
      } else if (options.devtool.includes('eval')) {
        const EvalDevToolModulePlugin = require('./EvalDevToolModulePlugin');
        new EvalDevToolModulePlugin({
          moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
          namespace: options.output.devtoolNamespace,
        }).apply(compiler);
      }
    }

    new JavascriptModulesPlugin().apply(compiler);
    new JsonModulesPlugin().apply(compiler);
    new AssetModulesPlugin().apply(compiler);

    if (!options.experiments.outputModule) {
      if (options.output.module) {
        throw new Error(
          /** 'output.module: true'：只允许当'实验。输出模块'被启用 */
          "'output.module: true' is only allowed when 'experiments.outputModule' is enabled"
        );
      }
      if (options.output.enabledLibraryTypes.includes('module')) {
        throw new Error(
          'library type "module" is only allowed when \'experiments.outputModule\' is enabled'
        );
      }
      if (options.externalsType === 'module') {
        throw new Error(
          "'externalsType: \"module\"' is only allowed when 'experiments.outputModule' is enabled"
        );
      }
    }

    if (options.experiments.syncWebAssembly) {
      const WebAssemblyModulesPlugin = require('./wasm-sync/WebAssemblyModulesPlugin');
      new WebAssemblyModulesPlugin({
        mangleImports: options.optimization.mangleWasmImports,
      }).apply(compiler);
    }

    if (options.experiments.asyncWebAssembly) {
      const AsyncWebAssemblyModulesPlugin = require('./wasm-async/AsyncWebAssemblyModulesPlugin');
      new AsyncWebAssemblyModulesPlugin({
        mangleImports: options.optimization.mangleWasmImports,
      }).apply(compiler);
    }

    if (options.experiments.css) {
      const CssModulesPlugin = require('./css/CssModulesPlugin');
      new CssModulesPlugin(options.experiments.css).apply(compiler);
    }

    if (options.experiments.lazyCompilation) {
      const LazyCompilationPlugin = require('./hmr/LazyCompilationPlugin');
      const lazyOptions =
        typeof options.experiments.lazyCompilation === 'object'
          ? options.experiments.lazyCompilation
          : null;
      new LazyCompilationPlugin({
        backend:
          typeof lazyOptions.backend === 'function'
            ? lazyOptions.backend
            : require('./hmr/lazyCompilationBackend')({
                ...lazyOptions.backend,
                client:
                  (lazyOptions.backend && lazyOptions.backend.client) ||
                  require.resolve(
                    `../hot/lazy-compilation-${
                      options.externalsPresets.node ? 'node' : 'web'
                    }.js`
                  ),
              }),
        entries: !lazyOptions || lazyOptions.entries !== false,
        imports: !lazyOptions || lazyOptions.imports !== false,
        test: (lazyOptions && lazyOptions.test) || undefined,
      }).apply(compiler);
    }

    if (options.experiments.buildHttp) {
      const HttpUriPlugin = require('./schemes/HttpUriPlugin');
      const httpOptions = options.experiments.buildHttp;
      new HttpUriPlugin(httpOptions).apply(compiler);
    }

    // 处理 entry 的插件，处理逻辑见插件注释
    new EntryOptionPlugin().apply(compiler);
    /**
     * entryOption 钩子：在 webpack 选项中的 entry 被处理过之后调用
     * SyncBailHook 类型钩子：同步钩子，执行过程中注册的回调返回非 undefined 时就停止不在执行。
     *
     * 因为用户级别的插件已经被注册，所以先执行用户的钩子，让用户先处理一下 entry
     * 然后在通过上面的 EntryOptionPlugin 插件内部处理 entry 钩子
     */
    compiler.hooks.entryOption.call(options.context, options.entry);

    new RuntimePlugin().apply(compiler);

    new InferAsyncModulesPlugin().apply(compiler);

    new DataUriPlugin().apply(compiler);
    new FileUriPlugin().apply(compiler);

    new CompatibilityPlugin().apply(compiler);
    new HarmonyModulesPlugin({
      topLevelAwait: options.experiments.topLevelAwait,
    }).apply(compiler);
    if (options.amd !== false) {
      const AMDPlugin = require('./dependencies/AMDPlugin');
      const RequireJsStuffPlugin = require('./RequireJsStuffPlugin');
      new AMDPlugin(options.amd || {}).apply(compiler);
      new RequireJsStuffPlugin().apply(compiler);
    }
    new CommonJsPlugin().apply(compiler);
    new LoaderPlugin({}).apply(compiler);
    if (options.node !== false) {
      const NodeStuffPlugin = require('./NodeStuffPlugin');
      new NodeStuffPlugin(options.node).apply(compiler);
    }
    new APIPlugin().apply(compiler);
    new ExportsInfoApiPlugin().apply(compiler);
    new WebpackIsIncludedPlugin().apply(compiler);
    new ConstPlugin().apply(compiler);
    new UseStrictPlugin().apply(compiler);
    new RequireIncludePlugin().apply(compiler);
    new RequireEnsurePlugin().apply(compiler);
    new RequireContextPlugin().apply(compiler);
    new ImportPlugin().apply(compiler);
    new SystemPlugin().apply(compiler);
    new ImportMetaPlugin().apply(compiler);
    new URLPlugin().apply(compiler);
    new WorkerPlugin(
      options.output.workerChunkLoading,
      options.output.workerWasmLoading,
      options.output.module
    ).apply(compiler);

    new DefaultStatsFactoryPlugin().apply(compiler);
    new DefaultStatsPresetPlugin().apply(compiler);
    new DefaultStatsPrinterPlugin().apply(compiler);

    new JavascriptMetaInfoPlugin().apply(compiler);

    if (typeof options.mode !== 'string') {
      const WarnNoModeSetPlugin = require('./WarnNoModeSetPlugin');
      new WarnNoModeSetPlugin().apply(compiler);
    }

    const EnsureChunkConditionsPlugin = require('./optimize/EnsureChunkConditionsPlugin');
    new EnsureChunkConditionsPlugin().apply(compiler);
    if (options.optimization.removeAvailableModules) {
      const RemoveParentModulesPlugin = require('./optimize/RemoveParentModulesPlugin');
      new RemoveParentModulesPlugin().apply(compiler);
    }
    if (options.optimization.removeEmptyChunks) {
      const RemoveEmptyChunksPlugin = require('./optimize/RemoveEmptyChunksPlugin');
      new RemoveEmptyChunksPlugin().apply(compiler);
    }
    if (options.optimization.mergeDuplicateChunks) {
      const MergeDuplicateChunksPlugin = require('./optimize/MergeDuplicateChunksPlugin');
      new MergeDuplicateChunksPlugin().apply(compiler);
    }
    if (options.optimization.flagIncludedChunks) {
      const FlagIncludedChunksPlugin = require('./optimize/FlagIncludedChunksPlugin');
      new FlagIncludedChunksPlugin().apply(compiler);
    }
    if (options.optimization.sideEffects) {
      const SideEffectsFlagPlugin = require('./optimize/SideEffectsFlagPlugin');
      new SideEffectsFlagPlugin(
        options.optimization.sideEffects === true
      ).apply(compiler);
    }
    if (options.optimization.providedExports) {
      const FlagDependencyExportsPlugin = require('./FlagDependencyExportsPlugin');
      new FlagDependencyExportsPlugin().apply(compiler);
    }
    if (options.optimization.usedExports) {
      const FlagDependencyUsagePlugin = require('./FlagDependencyUsagePlugin');
      new FlagDependencyUsagePlugin(
        options.optimization.usedExports === 'global'
      ).apply(compiler);
    }
    if (options.optimization.innerGraph) {
      const InnerGraphPlugin = require('./optimize/InnerGraphPlugin');
      new InnerGraphPlugin().apply(compiler);
    }
    if (options.optimization.mangleExports) {
      const MangleExportsPlugin = require('./optimize/MangleExportsPlugin');
      new MangleExportsPlugin(
        options.optimization.mangleExports !== 'size'
      ).apply(compiler);
    }
    if (options.optimization.concatenateModules) {
      const ModuleConcatenationPlugin = require('./optimize/ModuleConcatenationPlugin');
      new ModuleConcatenationPlugin().apply(compiler);
    }
    if (options.optimization.splitChunks) {
      const SplitChunksPlugin = require('./optimize/SplitChunksPlugin');
      new SplitChunksPlugin(options.optimization.splitChunks).apply(compiler);
    }
    if (options.optimization.runtimeChunk) {
      const RuntimeChunkPlugin = require('./optimize/RuntimeChunkPlugin');
      new RuntimeChunkPlugin(options.optimization.runtimeChunk).apply(compiler);
    }
    if (!options.optimization.emitOnErrors) {
      const NoEmitOnErrorsPlugin = require('./NoEmitOnErrorsPlugin');
      new NoEmitOnErrorsPlugin().apply(compiler);
    }
    if (options.optimization.realContentHash) {
      const RealContentHashPlugin = require('./optimize/RealContentHashPlugin');
      new RealContentHashPlugin({
        hashFunction: options.output.hashFunction,
        hashDigest: options.output.hashDigest,
      }).apply(compiler);
    }
    if (options.optimization.checkWasmTypes) {
      const WasmFinalizeExportsPlugin = require('./wasm-sync/WasmFinalizeExportsPlugin');
      new WasmFinalizeExportsPlugin().apply(compiler);
    }
    const moduleIds = options.optimization.moduleIds;
    if (moduleIds) {
      switch (moduleIds) {
        case 'natural': {
          const NaturalModuleIdsPlugin = require('./ids/NaturalModuleIdsPlugin');
          new NaturalModuleIdsPlugin().apply(compiler);
          break;
        }
        case 'named': {
          const NamedModuleIdsPlugin = require('./ids/NamedModuleIdsPlugin');
          new NamedModuleIdsPlugin().apply(compiler);
          break;
        }
        case 'hashed': {
          const WarnDeprecatedOptionPlugin = require('./WarnDeprecatedOptionPlugin');
          const HashedModuleIdsPlugin = require('./ids/HashedModuleIdsPlugin');
          new WarnDeprecatedOptionPlugin(
            'optimization.moduleIds',
            'hashed',
            'deterministic'
          ).apply(compiler);
          new HashedModuleIdsPlugin({
            hashFunction: options.output.hashFunction,
          }).apply(compiler);
          break;
        }
        case 'deterministic': {
          const DeterministicModuleIdsPlugin = require('./ids/DeterministicModuleIdsPlugin');
          new DeterministicModuleIdsPlugin().apply(compiler);
          break;
        }
        case 'size': {
          const OccurrenceModuleIdsPlugin = require('./ids/OccurrenceModuleIdsPlugin');
          new OccurrenceModuleIdsPlugin({
            prioritiseInitial: true,
          }).apply(compiler);
          break;
        }
        default:
          throw new Error(
            `webpack bug: moduleIds: ${moduleIds} is not implemented`
          );
      }
    }
    const chunkIds = options.optimization.chunkIds;
    if (chunkIds) {
      switch (chunkIds) {
        case 'natural': {
          const NaturalChunkIdsPlugin = require('./ids/NaturalChunkIdsPlugin');
          new NaturalChunkIdsPlugin().apply(compiler);
          break;
        }
        case 'named': {
          const NamedChunkIdsPlugin = require('./ids/NamedChunkIdsPlugin');
          new NamedChunkIdsPlugin().apply(compiler);
          break;
        }
        case 'deterministic': {
          const DeterministicChunkIdsPlugin = require('./ids/DeterministicChunkIdsPlugin');
          new DeterministicChunkIdsPlugin().apply(compiler);
          break;
        }
        case 'size': {
          //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
          const OccurrenceChunkIdsPlugin = require('./ids/OccurrenceChunkIdsPlugin');
          new OccurrenceChunkIdsPlugin({
            prioritiseInitial: true,
          }).apply(compiler);
          break;
        }
        case 'total-size': {
          //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
          const OccurrenceChunkIdsPlugin = require('./ids/OccurrenceChunkIdsPlugin');
          new OccurrenceChunkIdsPlugin({
            prioritiseInitial: false,
          }).apply(compiler);
          break;
        }
        default:
          throw new Error(
            `webpack bug: chunkIds: ${chunkIds} is not implemented`
          );
      }
    }
    if (options.optimization.nodeEnv) {
      const DefinePlugin = require('./DefinePlugin');
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.optimization.nodeEnv),
      }).apply(compiler);
    }
    if (options.optimization.minimize) {
      for (const minimizer of options.optimization.minimizer) {
        if (typeof minimizer === 'function') {
          minimizer.call(compiler, compiler);
        } else if (minimizer !== '...') {
          minimizer.apply(compiler);
        }
      }
    }

    if (options.performance) {
      const SizeLimitsPlugin = require('./performance/SizeLimitsPlugin');
      new SizeLimitsPlugin(options.performance).apply(compiler);
    }

    /**
     * 用于替换模板字符串生成文件名：https://webpack.docschina.org/configuration/output/#template-strings
     * 内部会注册 compilation.hooks.assetPath 钩子，每个资产文件都会经过这个插件来生成文件名，具体见插件注释
     */
    new TemplatedPathPlugin().apply(compiler);

    new RecordIdsPlugin({
      portableIds: options.optimization.portableRecords,
    }).apply(compiler);

    new WarnCaseSensitiveModulesPlugin().apply(compiler);

    // 这个插件是处理 options.snapshot.managedPaths 和 immutablePaths 的，并没有做其他注册工作
    const AddManagedPathsPlugin = require('./cache/AddManagedPathsPlugin');
    new AddManagedPathsPlugin(
      options.snapshot.managedPaths,
      options.snapshot.immutablePaths
    ).apply(compiler);

    // 注册缓存相关插件
    if (options.cache && typeof options.cache === 'object') {
      const cacheOptions = options.cache; // 缓存配置项
      switch (cacheOptions.type) {
        case 'memory': {
          // 内存模式缓存
          /**
           * maxGenerations：定义内存缓存中未使用的缓存项的生命周期
           *  cache.maxGenerations: 1: 在一次编译中未使用的缓存被删除 => 数量对应着编译次数
           *  cache.maxGenerations: Infinity: 缓存将永远保存。
           */
          if (isFinite(cacheOptions.maxGenerations) /** maxGenerations 是一个有限数值 */) {
            //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
            // 与不考虑缓存失效相比，多了一层根据构建次数来判断缓存失效的逻辑
            const MemoryWithGcCachePlugin = require('./cache/MemoryWithGcCachePlugin');
            new MemoryWithGcCachePlugin({
              maxGenerations: cacheOptions.maxGenerations,
            }).apply(compiler);
          } else {
            //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
            // 不考虑缓存失效时，使用插件
            const MemoryCachePlugin = require('./cache/MemoryCachePlugin');
            new MemoryCachePlugin().apply(compiler);
          }
          if (cacheOptions.cacheUnaffected) { 
            if (!options.experiments.cacheUnaffected) {
              throw new Error(
                "'cache.cacheUnaffected: true' is only allowed when 'experiments.cacheUnaffected' is enabled"
              );
            }
            compiler.moduleMemCaches = new Map();
          }
          break;
        }
        case 'filesystem': {
          const AddBuildDependenciesPlugin = require('./cache/AddBuildDependenciesPlugin');
          for (const key in cacheOptions.buildDependencies) {
            const list = cacheOptions.buildDependencies[key];
            new AddBuildDependenciesPlugin(list).apply(compiler);
          }
          /**
           * cacheOptions.maxMemoryGenerations：定义内存缓存中未使用的缓存项的生命周期 -- https://webpack.docschina.org/configuration/other-options/#cachemaxmemorygenerations-cachemaxmemorygenerations
           *  cache.maxMemoryGenerations: 0: 持久化缓存不会使用额外的内存缓存。它只将项目缓存到内存中，直到它们被序列化到磁盘。一旦序列化，下一次读取将再次从磁盘反序列化它们。这种模式将最小化内存使用，但会带来性能成本。
           *  不为 0 时，就跟内存缓存一样，需要注册 MemoryCachePlugin 或 MemoryWithGcCachePlugin 插件
           */
          if (!isFinite(cacheOptions.maxMemoryGenerations)) {
            //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
            const MemoryCachePlugin = require('./cache/MemoryCachePlugin');
            new MemoryCachePlugin().apply(compiler);
          } else if (cacheOptions.maxMemoryGenerations !== 0) {
            //@ts-expect-error https://github.com/microsoft/TypeScript/issues/41697
            const MemoryWithGcCachePlugin = require('./cache/MemoryWithGcCachePlugin');
            new MemoryWithGcCachePlugin({
              maxGenerations: cacheOptions.maxMemoryGenerations,
            }).apply(compiler);
          }
          // 实验性质功能
          if (cacheOptions.memoryCacheUnaffected) {
            if (!options.experiments.cacheUnaffected) {
              throw new Error(
                "'cache.memoryCacheUnaffected: true' is only allowed when 'experiments.cacheUnaffected' is enabled" // “只有当”实验时才允许。启用了“cache unchanged”
              );
            }
            compiler.moduleMemCaches = new Map();
          }
          switch (cacheOptions.store) {
            // cacheOptions.store：告诉 webpack 什么时候将数据存放在文件系统中。目前只支持 pack
            // 当编译器闲置时候，将缓存数据都存放在一个文件中
            case 'pack': {
              // 文件系统缓存，插件实现
              const IdleFileCachePlugin = require('./cache/IdleFileCachePlugin');
              const PackFileCacheStrategy = require('./cache/PackFileCacheStrategy');
              new IdleFileCachePlugin(
                new PackFileCacheStrategy({
                  compiler, // compiler 实例
                  fs: compiler.intermediateFileSystem, // 文件系统
                  context: options.context, // 项目上下文
                  cacheLocation: cacheOptions.cacheLocation, // 缓存的路径。
                  version: cacheOptions.version, // 缓存数据的版本。不同版本不会允许重用缓存和重载当前的内容。当配置以一种无法重用缓存的方式改变时，要更新缓存的版本。这会让缓存失效。
                  logger: compiler.getInfrastructureLogger(
                    'webpack.cache.PackFileCacheStrategy'
                  ), // 打印类
                  snapshot: options.snapshot, // 快照配置
                  maxAge: cacheOptions.maxAge, // 允许未使用的缓存留在文件系统缓存中的时间（以毫秒为单位）；
                  profile: cacheOptions.profile, // 跟踪并记录各个 'filesystem' 缓存项的详细时间信息。
                  allowCollectingMemory: cacheOptions.allowCollectingMemory, // 收集在反序列化期间分配的未使用的内存
                  compression: cacheOptions.compression, // 压缩类型
                }),
                cacheOptions.idleTimeout, // 时间以毫秒为单位。cache.idleTimeout 表示缓存存储发生的时间间隔。
                cacheOptions.idleTimeoutForInitialStore,
                cacheOptions.idleTimeoutAfterLargeChanges
              ).apply(compiler);
              break;
            }
            default:
              throw new Error('Unhandled value for cache.store');
          }
          break;
        }
        default:
          // @ts-expect-error Property 'type' does not exist on type 'never'. ts(2339)
          // 其他类型不支持
          throw new Error(`Unknown cache type ${cacheOptions.type}`);
      }
    }
    new ResolverCachePlugin().apply(compiler);

    if (options.ignoreWarnings && options.ignoreWarnings.length > 0) {
      const IgnoreWarningsPlugin = require('./IgnoreWarningsPlugin');
      new IgnoreWarningsPlugin(options.ignoreWarnings).apply(compiler);
    }

    /**
     * afterPlugins 钩子：在初始化内部插件集合完成设置之后调用
     * SyncHook 钩子：基础同步钩子，顺序执行钩子事件
     */
    compiler.hooks.afterPlugins.call(compiler);
    if (!compiler.inputFileSystem) {
      throw new Error('No input filesystem provided'); // 没有提供输入文件系统
    }
    /**
     * HookMap 模块：可以动态添加钩子，钩子类型就是 HookMap 参数工厂返回的钩子类型
     */
    compiler.resolverFactory.hooks.resolveOptions
      .for('normal') /** 在这里就是，添加一个 normal 钩子，钩子类型是 SyncWaterfallHook 类型 */
      .tap('WebpackOptionsApply', (resolveOptions) => { /** 并注册这个钩子 */
        resolveOptions = cleverMerge(options.resolve, resolveOptions);
        resolveOptions.fileSystem = compiler.inputFileSystem;
        return resolveOptions;
      });
    // 同理，添加一个 context 钩子并注册钩子
    compiler.resolverFactory.hooks.resolveOptions
      .for('context')
      .tap('WebpackOptionsApply', (resolveOptions) => {
        resolveOptions = cleverMerge(options.resolve, resolveOptions);
        resolveOptions.fileSystem = compiler.inputFileSystem;
        resolveOptions.resolveToContext = true;
        return resolveOptions;
      });
    // 添加一个 loader 钩子并注册 - 在生成 loader 解析器时调用，用于合并 loader 解析器的配置项，配置了如何解析 loader
    compiler.resolverFactory.hooks.resolveOptions
      .for('loader')
      .tap('WebpackOptionsApply', (resolveOptions) => {
        // 合并 options.resolveLoader 和 resolveOptions(额外配置项) 配置项
        resolveOptions = cleverMerge(options.resolveLoader, resolveOptions);
        resolveOptions.fileSystem = compiler.inputFileSystem; // 额外添加一个读取文件系统
        return resolveOptions;
      });
    /**
     * afterResolvers 钩子：resolver 设置完成之后触发。
     * SyncHook 钩子：同步钩子，顺序执行
     * webpack 内部没有注册这个钩子
     */
    compiler.hooks.afterResolvers.call(compiler);
    return options;
  }
}

module.exports = WebpackOptionsApply;
