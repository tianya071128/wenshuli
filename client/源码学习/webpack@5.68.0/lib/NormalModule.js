/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const { getContext, runLoaders } = require("loader-runner");
const querystring = require("querystring");
const { HookMap, SyncHook, AsyncSeriesBailHook } = require("tapable");
const {
	CachedSource,
	OriginalSource,
	RawSource,
	SourceMapSource
} = require("webpack-sources");
const Compilation = require("./Compilation");
const HookWebpackError = require("./HookWebpackError");
const Module = require("./Module");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const ModuleParseError = require("./ModuleParseError");
const ModuleWarning = require("./ModuleWarning");
const RuntimeGlobals = require("./RuntimeGlobals");
const UnhandledSchemeError = require("./UnhandledSchemeError");
const WebpackError = require("./WebpackError");
const formatLocation = require("./formatLocation");
const LazySet = require("./util/LazySet");
const { isSubset } = require("./util/SetHelpers");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const {
	compareLocations,
	concatComparators,
	compareSelect,
	keepOriginalOrder
} = require("./util/comparators");
const createHash = require("./util/createHash");
const { createFakeHook } = require("./util/deprecation");
const { join } = require("./util/fs");
const {
	contextify,
	absolutify,
	makePathsRelative
} = require("./util/identifier");
const makeSerializable = require("./util/makeSerializable");
const memoize = require("./util/memoize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/LoaderContext").NormalModuleLoaderContext} NormalModuleLoaderContext */
/** @typedef {import("../declarations/WebpackOptions").Mode} Mode */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Generator")} Generator */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */
/** @typedef {import("./Parser")} Parser */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./logging/Logger").Logger} WebpackLogger */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} SourceMap
 * @property {number} version
 * @property {string[]} sources
 * @property {string} mappings
 * @property {string=} file
 * @property {string=} sourceRoot
 * @property {string[]=} sourcesContent
 * @property {string[]=} names
 */

const getInvalidDependenciesModuleWarning = memoize(() =>
	require("./InvalidDependenciesModuleWarning")
);
const getValidate = memoize(() => require("schema-utils").validate);

const ABSOLUTE_PATH_REGEX = /^([a-zA-Z]:\\|\\\\|\/)/;

/**
 * @typedef {Object} LoaderItem
 * @property {string} loader
 * @property {any} options
 * @property {string?} ident
 * @property {string?} type
 */

/**
 * 根据模块路径构建一个 sourceUrl
 * @param {string} context absolute context path 绝对上下文路径
 * @param {string} source a source path 源路径
 * @param {Object=} associatedObjectForCache an object to which the cache will be attached 缓存将附加到的对象
 * @returns {string} new source path 新源路径
 */
const contextifySourceUrl = (context, source, associatedObjectForCache) => {
	if (source.startsWith("webpack://")) return source;
	return `webpack://${makePathsRelative(
		context,
		source,
		associatedObjectForCache
	)}`;
};

/**
 * @param {string} context absolute context path 绝对上下文路径
 * @param {SourceMap} sourceMap a source map sourcemap 信息
 * @param {Object=} associatedObjectForCache an object to which the cache will be attached 缓存将附加到的对象缓存将附加到的对象
 * @returns {SourceMap} new source map 新的 sourcemap
 */
const contextifySourceMap = (context, sourceMap, associatedObjectForCache) => {
	if (!Array.isArray(sourceMap.sources)) return sourceMap; // sourceMap.sources：转换前的文件,该项是一个数组,表示可能存在多个文件合并
	const { sourceRoot } = sourceMap; // 转换前的文件所在的目录。如果与转换前的文件在同一目录，该项为空
	/** @type {function(string): string} */
	const mapper = !sourceRoot
		? source => source
		: sourceRoot.endsWith("/")
		? source =>
				source.startsWith("/")
					? `${sourceRoot.slice(0, -1)}${source}`
					: `${sourceRoot}${source}`
		: source =>
				source.startsWith("/")
					? `${sourceRoot}${source}`
					: `${sourceRoot}/${source}`;
	const newSources = sourceMap.sources.map(source =>
		contextifySourceUrl(context, mapper(source), associatedObjectForCache)
	);
	return {
		...sourceMap,
		file: "x",
		sourceRoot: undefined,
		sources: newSources // 将 sourceMap.sources 转化为 webpack:// 开头的路径 -- 'webpack://./src/index.js'
	};
};

/**
 * 将输入值 input 转化为 string
 * @param {string | Buffer} input the input
 * @returns {string} the converted string
 */
const asString = input => {
	if (Buffer.isBuffer(input)) {
		return input.toString("utf-8");
	}
	return input;
};

/**
 * @param {string | Buffer} input the input
 * @returns {Buffer} the converted buffer
 */
const asBuffer = input => {
	if (!Buffer.isBuffer(input)) {
		return Buffer.from(input, "utf-8");
	}
	return input;
};

class NonErrorEmittedError extends WebpackError {
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = "(Emitted value instead of an instance of Error) " + error;
	}
}

makeSerializable(
	NonErrorEmittedError,
	"webpack/lib/NormalModule",
	"NonErrorEmittedError"
);

/**
 * @typedef {Object} NormalModuleCompilationHooks
 * @property {SyncHook<[object, NormalModule]>} loader
 * @property {SyncHook<[LoaderItem[], NormalModule, object]>} beforeLoaders
 * @property {SyncHook<[NormalModule]>} beforeParse
 * @property {SyncHook<[NormalModule]>} beforeSnapshot
 * @property {HookMap<AsyncSeriesBailHook<[string, NormalModule], string | Buffer>>} readResourceForScheme
 * @property {HookMap<AsyncSeriesBailHook<[object], string | Buffer>>} readResource
 * @property {AsyncSeriesBailHook<[NormalModule, NeedBuildContext], boolean>} needBuild
 */

/** @type {WeakMap<Compilation, NormalModuleCompilationHooks>} */
const compilationHooksMap = new WeakMap();

class NormalModule extends Module {
	/**
	 * 获取 compilation 对应的 module 构建构成中需要执行的钩子列表
	 * @param {Compilation} compilation the compilation compilation 实例
	 * @returns {NormalModuleCompilationHooks} the attached hooks 需要附加的 hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation" // “compilation”参数必须是compilation的实例
			);
		}
		// 构建的 hooks 缓存到 compilationHooksMap 中
		let hooks = compilationHooksMap.get(compilation);
		// 如果该 compilation 没有创建过 hooks 的话，初次创建
		if (hooks === undefined) {
			hooks = {
				loader: new SyncHook(["loaderContext", "module"]),
				beforeLoaders: new SyncHook(["loaders", "module", "loaderContext"]),
				beforeParse: new SyncHook(["module"]),
				beforeSnapshot: new SyncHook(["module"]),
				// TODO webpack 6 deprecate
				readResourceForScheme: new HookMap(scheme => {
					const hook = hooks.readResource.for(scheme);
					return createFakeHook(
						/** @type {AsyncSeriesBailHook<[string, NormalModule], string | Buffer>} */ ({
							tap: (options, fn) =>
								hook.tap(options, loaderContext =>
									fn(loaderContext.resource, loaderContext._module)
								),
							tapAsync: (options, fn) =>
								hook.tapAsync(options, (loaderContext, callback) =>
									fn(loaderContext.resource, loaderContext._module, callback)
								),
							tapPromise: (options, fn) =>
								hook.tapPromise(options, loaderContext =>
									fn(loaderContext.resource, loaderContext._module)
								)
						})
					);
				}),
				readResource: new HookMap(
					() => new AsyncSeriesBailHook(["loaderContext"])
				),
				needBuild: new AsyncSeriesBailHook(["module", "context"])
			};
			// 进行缓存
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {Object} options options object
	 * @param {string=} options.layer an optional layer in which the module is 模块所在的可选层
	 * @param {string} options.type module type 模块类型(e.g: javascript/auto)
	 * @param {string} options.request request string 请求字符串(C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\babel-loader\\lib\\index.js??ruleSet[1].rules[0].use!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js)
	 * @param {string} options.userRequest request intended by user (without loaders from config) 用户预期的请求（配置中没有加载程序）-- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js"
	 * @param {string} options.rawRequest request without resolving 请求而不解决 -- './src/index.js'
	 * @param {LoaderItem[]} options.loaders list of loaders loader 清单 -- [loader...]
	 * @param {string} options.resource path + query of the real resource 路径+真实资源的查询-- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js
	 * @param {Record<string, any>=} options.resourceResolveData resource resolve data 资源解析数据
	 * @param {string} options.context context directory for resolving 用于解析的上下文目录 - 'C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src'
	 * @param {string | undefined} options.matchResource path + query of the matched resource (virtual) 匹配资源的路径+查询（虚拟）
	 * @param {Parser} options.parser the parser used 使用的解析器
	 * @param {object} options.parserOptions the options of the parser used 使用的解析器的选项
	 * @param {Generator} options.generator the generator used generator 使用
	 * @param {object} options.generatorOptions the options of the generator used 所用 generator 的选项
	 * @param {Object} options.resolveOptions options used for resolving requests from this module 用于解析来自此模块的请求的选项
	 */
	constructor({
		layer,
		type,
		request,
		userRequest,
		rawRequest,
		loaders,
		resource,
		resourceResolveData,
		context,
		matchResource,
		parser,
		parserOptions,
		generator,
		generatorOptions,
		resolveOptions
	}) {
		super(type, context || getContext(resource), layer);

		// Info from Factory
		/** @type {string} */
		this.request = request;
		/** @type {string} */
		this.userRequest = userRequest;
		/** @type {string} */
		this.rawRequest = rawRequest;
		/** @type {boolean} */
		this.binary = /^(asset|webassembly)\b/.test(type);
		/** @type {Parser} */
		this.parser = parser;
		this.parserOptions = parserOptions;
		/** @type {Generator} */
		this.generator = generator;
		this.generatorOptions = generatorOptions;
		/** @type {string} */
		this.resource = resource;
		this.resourceResolveData = resourceResolveData;
		/** @type {string | undefined} */
		this.matchResource = matchResource;
		/** @type {LoaderItem[]} */
		this.loaders = loaders;
		if (resolveOptions !== undefined) {
			// already declared in super class
			this.resolveOptions = resolveOptions;
		}

		// Info from Build
		/** @type {(WebpackError | null)=} */
		this.error = null;
		/** @private @type {Source=} */
		this._source = null;
		/** @private @type {Map<string, number> | undefined} **/
		this._sourceSizes = undefined;
		/** @private @type {Set<string>} */
		this._sourceTypes = undefined;

		// Cache
		this._lastSuccessfulBuildMeta = {};
		this._forceBuild = true;
		this._isEvaluatingSideEffects = false;
		/** @type {WeakSet<ModuleGraph> | undefined} */
		this._addedSideEffectsBailout = undefined;
	}

	/**
	 * 获取模块的唯一标识符
	 * @returns {string} a unique identifier of the module 模块的唯一标识符
	 */
	identifier() {
		if (this.layer === null) {
			// 如果是 js 文件
			if (this.type === "javascript/auto") {
				return this.request; // 返回组装的路径 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\babel-loader\\lib\\index.js??ruleSet[1].rules[0].use!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js
			} else {
				return `${this.type}|${this.request}`;
			}
		} else {
			return `${this.type}|${this.request}|${this.layer}`;
		}
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.userRequest);
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		let ident = contextify(
			options.context,
			this.userRequest,
			options.associatedObjectForCache
		);
		if (this.layer) ident = `(${this.layer})/${ident}`;
		return ident;
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		const resource = this.matchResource || this.resource;
		const idx = resource.indexOf("?");
		if (idx >= 0) return resource.substr(0, idx);
		return resource;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {NormalModule} */ (module);
		this.binary = m.binary;
		this.request = m.request;
		this.userRequest = m.userRequest;
		this.rawRequest = m.rawRequest;
		this.parser = m.parser;
		this.parserOptions = m.parserOptions;
		this.generator = m.generator;
		this.generatorOptions = m.generatorOptions;
		this.resource = m.resource;
		this.resourceResolveData = m.resourceResolveData;
		this.context = m.context;
		this.matchResource = m.matchResource;
		this.loaders = m.loaders;
	}

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache() {
		// Make sure to cache types and sizes before cleanup when this module has been built
		// They are accessed by the stats and we don't want them to crash after cleanup
		// TODO reconsider this for webpack 6
		if (this.buildInfo) {
			if (this._sourceTypes === undefined) this.getSourceTypes();
			for (const type of this._sourceTypes) {
				this.size(type);
			}
		}
		super.cleanupForCache();
		this.parser = undefined;
		this.parserOptions = undefined;
		this.generator = undefined;
		this.generatorOptions = undefined;
	}

	/**
	 * Module should be unsafe cached. Get data that's needed for that.
	 * This data will be passed to restoreFromUnsafeCache later.
	 * @returns {object} cached data
	 */
	getUnsafeCacheData() {
		const data = super.getUnsafeCacheData();
		data.parserOptions = this.parserOptions;
		data.generatorOptions = this.generatorOptions;
		return data;
	}

	restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		this._restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory);
	}

	/**
	 * restore unsafe cache data
	 * @param {object} unsafeCacheData data from getUnsafeCacheData
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory handling the unsafe caching
	 */
	_restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		super._restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory);
		this.parserOptions = unsafeCacheData.parserOptions;
		this.parser = normalModuleFactory.getParser(this.type, this.parserOptions);
		this.generatorOptions = unsafeCacheData.generatorOptions;
		this.generator = normalModuleFactory.getGenerator(
			this.type,
			this.generatorOptions
		);
		// we assume the generator behaves identically and keep cached sourceTypes/Sizes
	}

	/**
	 * @param {string} context the compilation context
	 * @param {string} name the asset name
	 * @param {string} content the content
	 * @param {string | TODO} sourceMap an optional source map
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSourceForAsset(
		context,
		name,
		content,
		sourceMap,
		associatedObjectForCache
	) {
		if (sourceMap) {
			if (
				typeof sourceMap === "string" &&
				(this.useSourceMap || this.useSimpleSourceMap)
			) {
				return new OriginalSource(
					content,
					contextifySourceUrl(context, sourceMap, associatedObjectForCache)
				);
			}

			if (this.useSourceMap) {
				return new SourceMapSource(
					content,
					name,
					contextifySourceMap(context, sourceMap, associatedObjectForCache)
				);
			}
		}

		return new RawSource(content);
	}

	/**
	 * @param {ResolverWithOptions} resolver a resolver 解析路径方法
	 * @param {WebpackOptions} options webpack options webpack 配置项
	 * @param {Compilation} compilation the compilation compilation 实例
	 * @param {InputFileSystem} fs file system from reading  操作文件方法(类似于 Node 的 fs 模块)
	 * @param {NormalModuleCompilationHooks} hooks the hooks 构建过程需要执行的 hooks 列表
	 * @returns {NormalModuleLoaderContext} loader context 返回一个该模块构建过程中 loader 执行上下文
	 */
	_createLoaderContext(resolver, options, compilation, fs, hooks) {
		const { requestShortener } = compilation.runtimeTemplate;
		const getCurrentLoaderName = () => {
			const currentLoader = this.getCurrentLoader(loaderContext);
			if (!currentLoader) return "(not in loader scope)";
			return requestShortener.shorten(currentLoader.loader);
		};
		const getResolveContext = () => {
			return {
				fileDependencies: {
					add: d => loaderContext.addDependency(d)
				},
				contextDependencies: {
					add: d => loaderContext.addContextDependency(d)
				},
				missingDependencies: {
					add: d => loaderContext.addMissingDependency(d)
				}
			};
		};
		const getAbsolutify = memoize(() =>
			absolutify.bindCache(compilation.compiler.root)
		);
		const getAbsolutifyInContext = memoize(() =>
			absolutify.bindContextCache(this.context, compilation.compiler.root)
		);
		const getContextify = memoize(() =>
			contextify.bindCache(compilation.compiler.root)
		);
		const getContextifyInContext = memoize(() =>
			contextify.bindContextCache(this.context, compilation.compiler.root)
		);
		const utils = {
			absolutify: (context, request) => {
				return context === this.context
					? getAbsolutifyInContext()(request)
					: getAbsolutify()(context, request);
			},
			contextify: (context, request) => {
				return context === this.context
					? getContextifyInContext()(request)
					: getContextify()(context, request);
			},
			createHash: type => {
				return createHash(type || compilation.outputOptions.hashFunction);
			}
		};
		const loaderContext = {
			version: 2,
			getOptions: schema => {
				const loader = this.getCurrentLoader(loaderContext);

				let { options } = loader;

				if (typeof options === "string") {
					if (options.substr(0, 1) === "{" && options.substr(-1) === "}") {
						try {
							options = parseJson(options);
						} catch (e) {
							throw new Error(`Cannot parse string options: ${e.message}`);
						}
					} else {
						options = querystring.parse(options, "&", "=", {
							maxKeys: 0
						});
					}
				}

				if (options === null || options === undefined) {
					options = {};
				}

				if (schema) {
					let name = "Loader";
					let baseDataPath = "options";
					let match;
					if (schema.title && (match = /^(.+) (.+)$/.exec(schema.title))) {
						[, name, baseDataPath] = match;
					}
					getValidate()(schema, options, {
						name,
						baseDataPath
					});
				}

				return options;
			},
			emitWarning: warning => {
				if (!(warning instanceof Error)) {
					warning = new NonErrorEmittedError(warning);
				}
				this.addWarning(
					new ModuleWarning(warning, {
						from: getCurrentLoaderName()
					})
				);
			},
			emitError: error => {
				if (!(error instanceof Error)) {
					error = new NonErrorEmittedError(error);
				}
				this.addError(
					new ModuleError(error, {
						from: getCurrentLoaderName()
					})
				);
			},
			getLogger: name => {
				const currentLoader = this.getCurrentLoader(loaderContext);
				return compilation.getLogger(() =>
					[currentLoader && currentLoader.loader, name, this.identifier()]
						.filter(Boolean)
						.join("|")
				);
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, getResolveContext(), callback);
			},
			getResolve(options) {
				const child = options ? resolver.withOptions(options) : resolver;
				return (context, request, callback) => {
					if (callback) {
						child.resolve({}, context, request, getResolveContext(), callback);
					} else {
						return new Promise((resolve, reject) => {
							child.resolve(
								{},
								context,
								request,
								getResolveContext(),
								(err, result) => {
									if (err) reject(err);
									else resolve(result);
								}
							);
						});
					}
				};
			},
			emitFile: (name, content, sourceMap, assetInfo) => {
				if (!this.buildInfo.assets) {
					this.buildInfo.assets = Object.create(null);
					this.buildInfo.assetsInfo = new Map();
				}
				this.buildInfo.assets[name] = this.createSourceForAsset(
					options.context,
					name,
					content,
					sourceMap,
					compilation.compiler.root
				);
				this.buildInfo.assetsInfo.set(name, assetInfo);
			},
			addBuildDependency: dep => {
				if (this.buildInfo.buildDependencies === undefined) {
					this.buildInfo.buildDependencies = new LazySet();
				}
				this.buildInfo.buildDependencies.add(dep);
			},
			utils,
			rootContext: options.context,
			webpack: true,
			sourceMap: !!this.useSourceMap,
			mode: options.mode || "production",
			_module: this,
			_compilation: compilation,
			_compiler: compilation.compiler,
			fs: fs
		};

		Object.assign(loaderContext, options.loader);

		// 构建完成 loaderContext 时调用钩子，在这里 webpack 会添加 importModule、loadModule 方法到 loaderContext 上下文
		hooks.loader.call(loaderContext, this);

		return loaderContext;
	}

	// 返回指定索引(默认为当前执行 loader 索引)的 loader
	getCurrentLoader(loaderContext, index = loaderContext.loaderIndex) {
		if (
			this.loaders &&
			this.loaders.length &&
			index < this.loaders.length &&
			index >= 0 &&
			this.loaders[index]
		) {
			return this.loaders[index]; // 返回 loader
		}
		return null;
	}

	/**
	 * @param {string} context the compilation context 编译环境 -- 项目上下文(context 配置)
	 * @param {string | Buffer} content the content // 模块资源(loader 处理后的)
	 * @param {string | TODO} sourceMap an optional source map
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSource(context, content, sourceMap, associatedObjectForCache) {
		if (Buffer.isBuffer(content)) {
			return new RawSource(content);
		}

		// if there is no identifier return raw source 如果没有标识符，则返回原始源
		if (!this.identifier) {
			return new RawSource(content);
		}

		// from here on we assume we have an identifier 从这里开始，我们假设我们有一个标识符
		const identifier = this.identifier();

		// 此时需要构建 sourceMap 并且构建结果中返回了 sourceMap
		if (this.useSourceMap && sourceMap) {
			return new SourceMapSource(
				content,
				contextifySourceUrl(context, identifier, associatedObjectForCache), // 合成 sourceUrl 地址：
				contextifySourceMap(context, sourceMap, associatedObjectForCache) // 将 sourceMap.sources(转换前的文件,该项是一个数组,表示可能存在多个文件合并) 转化为 'webpack://./src/index.js' 形式路径
			);
		}

		if (this.useSourceMap || this.useSimpleSourceMap) {
			return new OriginalSource(
				content,
				contextifySourceUrl(context, identifier, associatedObjectForCache)
			);
		}

		return new RawSource(content);
	}

	/**
	 * @param {WebpackOptions} options webpack options webpack 配置项
	 * @param {Compilation} compilation the compilation compilation 实例
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system 操作文件方法(类似于 Node 的 fs 模块)
	 * @param {NormalModuleCompilationHooks} hooks the hooks 构建过程需要执行的钩子列表
	 * @param {function((WebpackError | null)=): void} callback callback function 构建完成后回调
	 * @returns {void}
	 */
	_doBuild(options, compilation, resolver, fs, hooks, callback) {
		// 调用 _createLoaderContext 方法创建 loader 执行时的上下文：https://webpack.docschina.org/api/loaders/#example-for-the-loader-context
		// 这里不会做具体逻辑，只是创建一个对象作为 laoderContext
		const loaderContext = this._createLoaderContext(
			resolver,
			options,
			compilation,
			fs,
			hooks
		);

		// 构建结束后回调 -- 统一调用
		const processResult = (err, result) => {
			// 出现构建错误时
			if (err) {
				if (!(err instanceof Error)) {
					err = new NonErrorEmittedError(err);
				}
				const currentLoader = this.getCurrentLoader(loaderContext);
				const error = new ModuleBuildError(err, {
					from:
						currentLoader &&
						compilation.runtimeTemplate.requestShortener.shorten(
							currentLoader.loader
						)
				});
				return callback(error);
			}

			const source = result[0]; // 提取出构建后的资源
			const sourceMap = result.length >= 1 ? result[1] : null; // 构建后的 sourcemap
			const extraInfo = result.length >= 2 ? result[2] : null; // 会被 webpack 忽略，可以是任何东西（例如一些元数据） -- https://webpack.docschina.org/api/loaders/#thiscallback

			if (!Buffer.isBuffer(source) && typeof source !== "string") {
				// 构建结果既不是 Buffer，也不是 string，此时构建结果错误
				const currentLoader = this.getCurrentLoader(loaderContext, 0);
				const err = new Error(
					`Final loader (${ // 最终 loader
						currentLoader
							? compilation.runtimeTemplate.requestShortener.shorten(
									currentLoader.loader
							  )
							: "unknown" // 未知的
					}) didn't return a Buffer or String` // 没有返回缓冲区或字符串
				);
				const error = new ModuleBuildError(err);
				return callback(error);
			}

			// 组装一下 sourcemap 信息，结合 sourcemap、source 信息生成一个对象
			// 并且将这个生成的对象赋值到 NormalModule._source 上，这样这个模块实例就通过 loader 编译后的内容就存储在模块实例上
			this._source = this.createSource(
				options.context, // 项目上下文 -- context
				this.binary ? asBuffer(source) /** 转化为 Buffer */ : asString(source) /** 转化为 string */,
				sourceMap, // sourceMap
				compilation.compiler.root
			);
			if (this._sourceSizes !== undefined) this._sourceSizes.clear();
			// 解析这个模块的 ast -- 如果希望在 loader 之间共享公共的 AST，可以将抽象语法树 AST（例如 ESTree）作为第四个参数（meta）传递，以加快构建时间。
			this._ast =
				typeof extraInfo === "object" &&
				extraInfo !== null &&
				extraInfo.webpackAST !== undefined
					? extraInfo.webpackAST
					: null;
			return callback(); // 直接调用 callback，通知模块构建完成，构建结果保存在 NormalModule._source 等相关信息上
		};

		// LazySet 与 Set 类似，但是增强了 Set 的功能
		this.buildInfo.fileDependencies = new LazySet(); // 该模块依赖的文件列表 -- 加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到。
		this.buildInfo.contextDependencies = new LazySet(); // 该模块依赖的目录列表
		this.buildInfo.missingDependencies = new LazySet();
		this.buildInfo.cacheable = true; // 模块初始化为可缓存

		try {
			// beforeLoaders 开始执行 loaders 构建钩子
			hooks.beforeLoaders.call(this.loaders, this, loaderContext);
		} catch (err) {
			processResult(err);
			return;
		}

		if (this.loaders.length > 0) {
			// 存在执行 loaders 时。。。
			this.buildInfo.buildDependencies = new LazySet();
		}

		// 调用 runLoaders 通过 loaders 处理模块
		runLoaders(
			{
				resource: this.resource, // 该模块文件路径
				loaders: this.loaders, // 用来处理模块的 loaders
				context: loaderContext, // loader 执行上下文
				// 用来加载模块资源(内容)
				processResource: (loaderContext, resourcePath, callback) => {
					const resource = loaderContext.resource; // 模块路径
					const scheme = getScheme(resource);
					hooks.readResource
						.for(scheme)
						.callAsync(loaderContext, (err, result) => {
							if (err) return callback(err);
							if (typeof result !== "string" && !result) {
								return callback(new UnhandledSchemeError(scheme, resource));
							}
							return callback(null, result);
						});
				}
			},
			// 构建完毕后回调
			(err, result) => {
				// Cleanup loaderContext to avoid leaking memory in ICs 清理loaderContext以避免IC内存泄漏
				loaderContext._compilation =
					loaderContext._compiler =
					loaderContext._module =
					loaderContext.fs =
						undefined;

				// 不存在构建结果的话，
				if (!result) {
					this.buildInfo.cacheable = false; // 错误构建结果不需要缓存
					return processResult(
						err || new Error("No result from loader-runner processing"), // loader 处理没有结果
						null
					);
				}
				this.buildInfo.fileDependencies.addAll(result.fileDependencies);
				this.buildInfo.contextDependencies.addAll(result.contextDependencies);
				this.buildInfo.missingDependencies.addAll(result.missingDependencies);
				for (const loader of this.loaders) {
					this.buildInfo.buildDependencies.add(loader.loader); // 存储下这个模块需要执行的 loader 列表
				}
				this.buildInfo.cacheable = this.buildInfo.cacheable && result.cacheable; // 是否缓存构建结果
				processResult(err, result.result);
			}
		);
	}

	/**
	 * @param {WebpackError} error the error 错误信息
	 * @returns {void}
	 */
	markModuleAsErrored(error) {
		// Restore build meta from successful build to keep importing state 从成功生成还原生成元以保持导入状态
		this.buildMeta = { ...this._lastSuccessfulBuildMeta };
		this.error = error;
		this.addError(error);
	}

	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if (typeof rule === "string") {
			return content.startsWith(rule);
		}

		if (typeof rule === "function") {
			return rule(content);
		}
		// we assume rule is a regexp
		return rule.test(content);
	}

	// check if module should not be parsed
	// returns "true" if the module should !not! be parsed
	// returns "false" if the module !must! be parsed
	shouldPreventParsing(noParseRule, request) {
		// if no noParseRule exists, return false
		// the module !must! be parsed.
		if (!noParseRule) {
			return false;
		}

		// we only have one rule to check
		if (!Array.isArray(noParseRule)) {
			// returns "true" if the module is !not! to be parsed
			return this.applyNoParseRule(noParseRule, request);
		}

		for (let i = 0; i < noParseRule.length; i++) {
			const rule = noParseRule[i];
			// early exit on first truthy match
			// this module is !not! to be parsed
			if (this.applyNoParseRule(rule, request)) {
				return true;
			}
		}
		// no match found, so this module !should! be parsed
		return false;
	}

	// 初始化这个模块的 hash 值
	_initBuildHash(compilation) {
		const hash = createHash(compilation.outputOptions.hashFunction);
		if (this._source) {
			hash.update("source");
			this._source.updateHash(hash);
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
		this.buildInfo.hash = /** @type {string} */ (hash.digest("hex"));
	}

	/**
	 * @param {WebpackOptions} options webpack options webpack 配置项
	 * @param {Compilation} compilation the compilation compilation 实例
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system 操作文件方法(类似于 Node 的 fs 模块)
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	/**
	 * 启动模块构建过程：调用此方法地方在 ./Compilation.js 的 _buildModule 方法中
	 * 1. build 方法：设置了一些模块属性，调用 _doBuild 方法实现构建模块
	 * 			--> _doBuild 方法：
	 * 				1. 调用 _createLoaderContext 方法创建 loader 执行时的上下文：https://webpack.docschina.org/api/loaders/#example-for-the-loader-context
	 * 					 这里不会做具体逻辑，只是创建一个对象作为 laoderContext
	 * 				2. 执行 hooks.beforeLoaders 钩子
	 * 				3. 执行 runLoaders 方法，启动 loader 构建过程
	 * 					 --> runLoaders 方法：启动 loader 构建模块 -- loader 的方法在另一个库中(loader-runner)
 	 * 							 1. 在这个方法中，主要是初始化 loaderContext 的属性，最后执行 iteratePitchingLoaders 方法启动 loaders 的 pitch 阶段
 	 * 							 2. iteratePitchingLoaders 方法执行 loaders 的 pitch 阶段 -- 从 loaders 开始到末尾顺序执行
 	 * 							 	  --> 1. 加载 loader 模块，提取出 loader 数据(normal 阶段执行方法、pitch 阶段执行方法、raw 标识)
 	 * 							 	  --> 2. 执行 pitch 阶段，如果 pitch 阶段返回了数据的话，那么跳过剩下的 loader，直接反过来执行 loader 的 normal 阶段
 	 * 							 		--> 3. 没有返回数据的话，继续执行下一个 loader 的 pitch 方法
 	 *  						 	  --> 4. 当所有的 loader 的 pitch 阶段执行完毕，那么启动 processResource 方法
 	 * 							 3. processResource 方法：提取出模块资源(提取为 Buffer)
 	 *  						 4. iterateNormalLoaders 方法 -- 从 loaders 末尾到开始顺序执行
 	 * 							 		--> 1. 根据 raw 标识，传入模块资源 Buffer 或 string 给 loader 处理
 	 * 							 		--> 2. 执行 loader 的 normal 方法，每个 loader 返回如下信息(content: string | Buffer、sourceMap?: SourceMap、meta?: any) -- https://webpack.docschina.org/api/loaders/#thiscallback
 	 * 							 		--> 3. 将上一个 loader 的结果返回给下一个需要执行的 loader(所有 soucemap 需要每个 laoder 都生成，最后合并成一个 soucemap)，最后执行完毕所有的 loader
 	 * 							 		--. 4. 最终会得到一个结果 result(Array<content: string | Buffer,sourceMap?: SourceMap,meta?: any>)
 	 *  						 5. 回到 iteratePitchingLoaders 执行完毕回调中，处理模块的构建结果，并调用 callback 返回启动位置(NormalModule._doBuild)
	 * 			  4. loader 处理完毕后，回到 runLoaders 方法的回调中，获取到处理的 result，组装一下 sourcemap 信息，结合 sourcemap、source 信息生成一个对象
	 * 					 并且将这个生成的对象赋值到 NormalModule._source 上，这样这个模块实例就通过 loader 编译后的内容就存储在模块实例上
	 * 				5. 最后回到 _doBuild 执行完毕回调中，即 build 方法调用 _doBuild 传入的回调
	 * 2. _doBuild 方法处理好了构建的模块，将其存储在模块实例的 _source 中，执行
 	 */
	build(options, compilation, resolver, fs, callback) {
		this._forceBuild = false;
		this._source = null;
		if (this._sourceSizes !== undefined) this._sourceSizes.clear();
		this._sourceTypes = undefined;
		this._ast = null;
		this.error = null;
		this.clearWarningsAndErrors(); // 在新构建模块的时候删除之前的模块警告和错误
		this.clearDependenciesAndBlocks(); // 删除所有依赖项和块
		this.buildMeta = {};
		this.buildInfo = { // 模块信息
			cacheable: false, // 是否可以缓存
			parsed: true,
			fileDependencies: undefined,
			contextDependencies: undefined,
			missingDependencies: undefined,
			buildDependencies: undefined,
			valueDependencies: undefined,
			hash: undefined,
			assets: undefined,
			assetsInfo: undefined
		};

		const startTime = compilation.compiler.fsStartTime || Date.now(); // 模块开始构建时间

		const hooks = NormalModule.getCompilationHooks(compilation); // 构建过程中需要执行的钩子 - 这些钩子是当前模块实例的，不会暴露给开发者

		// 设置了一些模块属性后，执行 _doBuild 构建
		return this._doBuild(options, compilation, resolver, fs, hooks, err => {
			// if we have an error mark module as failed and exit 如果出现错误，请将模块标记为失败并退出
			if (err) {
				this.markModuleAsErrored(err);
				this._initBuildHash(compilation);
				return callback();
			}

			// 解析模块为 AST 过程出错处理 - 标记一下解析 AST 错误
			const handleParseError = e => {
				const source = this._source.source(); // 获取模块资源
				// 根据 loaders 加载出路径
				const loaders = this.loaders.map(item =>
					contextify(options.context, item.loader, compilation.compiler.root)
				);
				const error = new ModuleParseError(source, e, loaders, this.type);
				this.markModuleAsErrored(error);
				this._initBuildHash(compilation);
				return callback();
			};

			// 解析模块为 AST 过程完成
			const handleParseResult = result => {
				this.dependencies.sort(
					concatComparators(
						compareSelect(a => a.loc, compareLocations),
						keepOriginalOrder(this.dependencies)
					)
				);
				this._initBuildHash(compilation); // 构建模块的 hash -- 存储在 this.buildInfo.hash: 'fb3946de651534a6717ed3745bd94032'
				this._lastSuccessfulBuildMeta = this.buildMeta;
				return handleBuildDone();
			};

			// 模块最终构建完毕：处理了 loader 编译、soucemap 处理、解析 ast、
			const handleBuildDone = () => {
				try {
					hooks.beforeSnapshot.call(this); // 钩子执行
				} catch (err) {
					this.markModuleAsErrored(err);
					return callback();
				}

				const snapshotOptions = compilation.options.snapshot.module;
				if (!this.buildInfo.cacheable || !snapshotOptions) {
					return callback();
				}
				// add warning for all non-absolute paths in fileDependencies, etc 为fileDependencies等中的所有非绝对路径添加警告
				// This makes it easier to find problems with watching and/or caching 这使得查找监视和/或缓存问题变得更容易
				let nonAbsoluteDependencies = undefined;
				const checkDependencies = deps => {
					for (const dep of deps) {
						if (!ABSOLUTE_PATH_REGEX.test(dep)) {
							if (nonAbsoluteDependencies === undefined)
								nonAbsoluteDependencies = new Set();
							nonAbsoluteDependencies.add(dep);
							deps.delete(dep);
							try {
								const depWithoutGlob = dep.replace(/[\\/]?\*.*$/, "");
								const absolute = join(
									compilation.fileSystemInfo.fs,
									this.context,
									depWithoutGlob
								);
								if (absolute !== dep && ABSOLUTE_PATH_REGEX.test(absolute)) {
									(depWithoutGlob !== dep
										? this.buildInfo.contextDependencies
										: deps
									).add(absolute);
								}
							} catch (e) {
								// ignore
							}
						}
					}
				};
				checkDependencies(this.buildInfo.fileDependencies);
				checkDependencies(this.buildInfo.missingDependencies);
				checkDependencies(this.buildInfo.contextDependencies);
				if (nonAbsoluteDependencies !== undefined) {
					const InvalidDependenciesModuleWarning =
						getInvalidDependenciesModuleWarning();
					this.addWarning(
						new InvalidDependenciesModuleWarning(this, nonAbsoluteDependencies)
					);
				}
				// convert file/context/missingDependencies into filesystem snapshot 将 file/context/missingDependencies 转换为文件系统快照
				compilation.fileSystemInfo.createSnapshot(
					startTime,
					this.buildInfo.fileDependencies,
					this.buildInfo.contextDependencies,
					this.buildInfo.missingDependencies,
					snapshotOptions,
					(err, snapshot) => {
						if (err) {
							this.markModuleAsErrored(err);
							return;
						}
						this.buildInfo.fileDependencies = undefined;
						this.buildInfo.contextDependencies = undefined;
						this.buildInfo.missingDependencies = undefined;
						this.buildInfo.snapshot = snapshot;
						return callback();
					}
				);
			};

			try {
				hooks.beforeParse.call(this); // 开始解析模块内容钩子
			} catch (err) {
				this.markModuleAsErrored(err);
				this._initBuildHash(compilation);
				return callback();
			}

			// check if this module should !not! be parsed. 检查此模块是否应该 !not! 不被解析。
			// if so, exit here; 如果是的话，从这里退出；
			const noParseRule = options.module && options.module.noParse; // options.module.noParse：防止 webpack 解析那些任何与给定正则表达式相匹配的文件。忽略的文件中 不应该含有 import, require, define 的调用，或任何其他导入机制 -- https://webpack.docschina.org/configuration/module/#modulenoparse
			if (this.shouldPreventParsing(noParseRule, this.request)) {
				// We assume that we need module and exports
				this.buildInfo.parsed = false;
				this._initBuildHash(compilation);
				return handleBuildDone();
			}

			let result;
			try {
				const source = this._source.source(); // 模块解析后的资源(内容)
				result = this.parser.parse(this._ast || source, {
					source,
					current: this,
					module: this,
					compilation: compilation,
					options: options
				});
			} catch (e) {
				handleParseError(e);
				return;
			}
			handleParseResult(result);
		});
	}

	/**
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(context) {
		return this.generator.getConcatenationBailoutReason(this, context);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		if (this.factoryMeta !== undefined) {
			if (this.factoryMeta.sideEffectFree) return false;
			if (this.factoryMeta.sideEffectFree === false) return true;
		}
		if (this.buildMeta !== undefined && this.buildMeta.sideEffectFree) {
			if (this._isEvaluatingSideEffects)
				return ModuleGraphConnection.CIRCULAR_CONNECTION;
			this._isEvaluatingSideEffects = true;
			/** @type {ConnectionState} */
			let current = false;
			for (const dep of this.dependencies) {
				const state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
				if (state === true) {
					if (
						this._addedSideEffectsBailout === undefined
							? ((this._addedSideEffectsBailout = new WeakSet()), true)
							: !this._addedSideEffectsBailout.has(moduleGraph)
					) {
						this._addedSideEffectsBailout.add(moduleGraph);
						moduleGraph
							.getOptimizationBailout(this)
							.push(
								() =>
									`Dependency (${
										dep.type
									}) with side effects at ${formatLocation(dep.loc)}`
							);
					}
					this._isEvaluatingSideEffects = false;
					return true;
				} else if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
					current = ModuleGraphConnection.addConnectionStates(current, state);
				}
			}
			this._isEvaluatingSideEffects = false;
			// When caching is implemented here, make sure to not cache when
			// at least one circular connection was in the loop above
			return current;
		} else {
			return true;
		}
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		if (this._sourceTypes === undefined) {
			this._sourceTypes = this.generator.getTypes(this);
		}
		return this._sourceTypes;
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime,
		concatenationScope,
		codeGenerationResults
	}) {
		/** @type {Set<string>} */
		const runtimeRequirements = new Set();

		if (!this.buildInfo.parsed) {
			runtimeRequirements.add(RuntimeGlobals.module);
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.thisAsExports);
		}

		/** @type {Map<string, any>} */
		let data;
		const getData = () => {
			if (data === undefined) data = new Map();
			return data;
		};

		const sources = new Map();
		for (const type of this.generator.getTypes(this)) {
			const source = this.error
				? new RawSource(
						"throw new Error(" + JSON.stringify(this.error.message) + ");"
				  )
				: this.generator.generate(this, {
						dependencyTemplates,
						runtimeTemplate,
						moduleGraph,
						chunkGraph,
						runtimeRequirements,
						runtime,
						concatenationScope,
						codeGenerationResults,
						getData,
						type
				  });

			if (source) {
				sources.set(type, new CachedSource(source));
			}
		}

		/** @type {CodeGenerationResult} */
		const resultEntry = {
			sources,
			runtimeRequirements,
			data
		};
		return resultEntry;
	}

	/**
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return this._source;
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		this._forceBuild = true;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function((WebpackError | null)=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		const { fileSystemInfo, compilation, valueCacheVersions } = context;
		// build if enforced 如果强制执行，则构建
		if (this._forceBuild) return callback(null, true);

		// always try to build in case of an error 始终尝试构建以防出现错误
		if (this.error) return callback(null, true);

		// always build when module is not cacheable 始终在模块不可缓存时生成
		if (!this.buildInfo.cacheable) return callback(null, true);

		// build when there is no snapshot to check 没有要检查的快照时生成
		if (!this.buildInfo.snapshot) return callback(null, true);

		// build when valueDependencies have changed 在valueDependencies发生更改时构建
		/** @type {Map<string, string | Set<string>>} */
		const valueDependencies = this.buildInfo.valueDependencies;
		if (valueDependencies) {
			if (!valueCacheVersions) return callback(null, true);
			for (const [key, value] of valueDependencies) {
				if (value === undefined) return callback(null, true);
				const current = valueCacheVersions.get(key);
				if (
					value !== current &&
					(typeof value === "string" ||
						typeof current === "string" ||
						current === undefined ||
						!isSubset(value, current))
				) {
					return callback(null, true);
				}
			}
		}

		// check snapshot for validity
		fileSystemInfo.checkSnapshotValid(this.buildInfo.snapshot, (err, valid) => {
			if (err) return callback(err);
			if (!valid) return callback(null, true);
			const hooks = NormalModule.getCompilationHooks(compilation);
			hooks.needBuild.callAsync(this, context, (err, needBuild) => {
				if (err) {
					return callback(
						HookWebpackError.makeWebpackError(
							err,
							"NormalModule.getCompilationHooks().needBuild"
						)
					);
				}
				callback(null, !!needBuild);
			});
		});
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		const cachedSize =
			this._sourceSizes === undefined ? undefined : this._sourceSizes.get(type);
		if (cachedSize !== undefined) {
			return cachedSize;
		}
		const size = Math.max(1, this.generator.getSize(this, type));
		if (this._sourceSizes === undefined) {
			this._sourceSizes = new Map();
		}
		this._sourceSizes.set(type, size);
		return size;
	}

	/**
	 * @param {LazySet<string>} fileDependencies set where file dependencies are added to
	 * @param {LazySet<string>} contextDependencies set where context dependencies are added to
	 * @param {LazySet<string>} missingDependencies set where missing dependencies are added to
	 * @param {LazySet<string>} buildDependencies set where build dependencies are added to
	 */
	addCacheDependencies(
		fileDependencies,
		contextDependencies,
		missingDependencies,
		buildDependencies
	) {
		const { snapshot, buildDependencies: buildDeps } = this.buildInfo;
		if (snapshot) {
			fileDependencies.addAll(snapshot.getFileIterable());
			contextDependencies.addAll(snapshot.getContextIterable());
			missingDependencies.addAll(snapshot.getMissingIterable());
		} else {
			const {
				fileDependencies: fileDeps,
				contextDependencies: contextDeps,
				missingDependencies: missingDeps
			} = this.buildInfo;
			if (fileDeps !== undefined) fileDependencies.addAll(fileDeps);
			if (contextDeps !== undefined) contextDependencies.addAll(contextDeps);
			if (missingDeps !== undefined) missingDependencies.addAll(missingDeps);
		}
		if (buildDeps !== undefined) {
			buildDependencies.addAll(buildDeps);
		}
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.buildInfo.hash);
		this.generator.updateHash(hash, {
			module: this,
			...context
		});
		super.updateHash(hash, context);
	}

	serialize(context) {
		const { write } = context;
		// deserialize
		write(this._source);
		write(this.error);
		write(this._lastSuccessfulBuildMeta);
		write(this._forceBuild);
		super.serialize(context);
	}

	static deserialize(context) {
		const obj = new NormalModule({
			// will be deserialized by Module
			layer: null,
			type: "",
			// will be filled by updateCacheModule
			resource: "",
			context: "",
			request: null,
			userRequest: null,
			rawRequest: null,
			loaders: null,
			matchResource: null,
			parser: null,
			parserOptions: null,
			generator: null,
			generatorOptions: null,
			resolveOptions: null
		});
		obj.deserialize(context);
		return obj;
	}

	deserialize(context) {
		const { read } = context;
		this._source = read();
		this.error = read();
		this._lastSuccessfulBuildMeta = read();
		this._forceBuild = read();
		super.deserialize(context);
	}
}

makeSerializable(NormalModule, "webpack/lib/NormalModule");

module.exports = NormalModule;
