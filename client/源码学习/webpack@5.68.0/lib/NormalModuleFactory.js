/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getContext } = require("loader-runner");
const asyncLib = require("neo-async");
const {
	AsyncSeriesBailHook,
	SyncWaterfallHook,
	SyncBailHook,
	SyncHook,
	HookMap
} = require("tapable");
const ChunkGraph = require("./ChunkGraph");
const Module = require("./Module");
const ModuleFactory = require("./ModuleFactory");
const ModuleGraph = require("./ModuleGraph");
const NormalModule = require("./NormalModule");
const BasicEffectRulePlugin = require("./rules/BasicEffectRulePlugin");
const BasicMatcherRulePlugin = require("./rules/BasicMatcherRulePlugin");
const ObjectMatcherRulePlugin = require("./rules/ObjectMatcherRulePlugin");
const RuleSetCompiler = require("./rules/RuleSetCompiler");
const UseEffectRulePlugin = require("./rules/UseEffectRulePlugin");
const LazySet = require("./util/LazySet");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const { cachedCleverMerge, cachedSetProperty } = require("./util/cleverMerge");
const { join } = require("./util/fs");
const { parseResource } = require("./util/identifier");

/** @typedef {import("../declarations/WebpackOptions").ModuleOptionsNormalized} ModuleOptions */
/** @typedef {import("./Generator")} Generator */
/** @typedef {import("./ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./Parser")} Parser */
/** @typedef {import("./ResolverFactory")} ResolverFactory */
/** @typedef {import("./dependencies/ModuleDependency")} ModuleDependency */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {Object} ResolveData
 * @property {ModuleFactoryCreateData["contextInfo"]} contextInfo
 * @property {ModuleFactoryCreateData["resolveOptions"]} resolveOptions
 * @property {string} context
 * @property {string} request
 * @property {Record<string, any> | undefined} assertions
 * @property {ModuleDependency[]} dependencies
 * @property {string} dependencyType
 * @property {Object} createData
 * @property {LazySet<string>} fileDependencies
 * @property {LazySet<string>} missingDependencies
 * @property {LazySet<string>} contextDependencies
 * @property {boolean} cacheable allow to use the unsafe cache
 */

/**
 * @typedef {Object} ResourceData
 * @property {string} resource
 * @property {string} path
 * @property {string} query
 * @property {string} fragment
 * @property {string=} context
 */

/** @typedef {ResourceData & { data: Record<string, any> }} ResourceDataWithData */

const EMPTY_RESOLVE_OPTIONS = {};
const EMPTY_PARSER_OPTIONS = {};
const EMPTY_GENERATOR_OPTIONS = {};
const EMPTY_ELEMENTS = [];

const MATCH_RESOURCE_REGEX = /^([^!]+)!=!/;

const loaderToIdent = data => {
	if (!data.options) {
		return data.loader;
	}
	if (typeof data.options === "string") {
		return data.loader + "?" + data.options;
	}
	if (typeof data.options !== "object") {
		throw new Error("loader options must be string or object");
	}
	if (data.ident) {
		return data.loader + "??" + data.ident;
	}
	return data.loader + "?" + JSON.stringify(data.options);
};

const stringifyLoadersAndResource = (loaders, resource) => {
	let str = "";
	for (const loader of loaders) {
		str += loaderToIdent(loader) + "!";
	}
	return str + resource;
};

/**
 * @param {string} resultString resultString
 * @returns {{loader: string, options: string|undefined}} parsed loader request
 */
const identToLoaderRequest = resultString => {
	const idx = resultString.indexOf("?");
	if (idx >= 0) {
		const loader = resultString.substr(0, idx);
		const options = resultString.substr(idx + 1);
		return {
			loader,
			options
		};
	} else {
		return {
			loader: resultString,
			options: undefined
		};
	}
};

const needCalls = (times, callback) => {
	return err => {
		if (--times === 0) {
			return callback(err);
		}
		if (err && times > 0) {
			times = NaN;
			return callback(err);
		}
	};
};

const mergeGlobalOptions = (globalOptions, type, localOptions) => {
	const parts = type.split("/");
	let result;
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const options = globalOptions[current];
		if (typeof options === "object") {
			if (result === undefined) {
				result = options;
			} else {
				result = cachedCleverMerge(result, options);
			}
		}
	}
	if (result === undefined) {
		return localOptions;
	} else {
		return cachedCleverMerge(result, localOptions);
	}
};

// TODO webpack 6 remove
const deprecationChangedHookMessage = (name /** 钩子名称 */, hook) => {
	const names = hook.taps
		.map(tapped => {
			return tapped.name;
		})
		.join(", ");

	return (
		`NormalModuleFactory.${name} (${names}) is no longer a waterfall hook, but a bailing hook instead. ` + // 不再是一个瀑布钩，而是一个舀水钩
		"Do not return the passed object, but modify it instead. " + // 不返回传递的对象，而是修改它
		"Returning false will ignore the request and results in no module created." // 返回false将忽略该请求并导致不创建任何模块
	);
};

const ruleSetCompiler = new RuleSetCompiler([
	new BasicMatcherRulePlugin("test", "resource"),
	new BasicMatcherRulePlugin("scheme"),
	new BasicMatcherRulePlugin("mimetype"),
	new BasicMatcherRulePlugin("dependency"),
	new BasicMatcherRulePlugin("include", "resource"),
	new BasicMatcherRulePlugin("exclude", "resource", true),
	new BasicMatcherRulePlugin("resource"),
	new BasicMatcherRulePlugin("resourceQuery"),
	new BasicMatcherRulePlugin("resourceFragment"),
	new BasicMatcherRulePlugin("realResource"),
	new BasicMatcherRulePlugin("issuer"),
	new BasicMatcherRulePlugin("compiler"),
	new BasicMatcherRulePlugin("issuerLayer"),
	new ObjectMatcherRulePlugin("assert", "assertions"),
	new ObjectMatcherRulePlugin("descriptionData"),
	new BasicEffectRulePlugin("type"),
	new BasicEffectRulePlugin("sideEffects"),
	new BasicEffectRulePlugin("parser"),
	new BasicEffectRulePlugin("resolve"),
	new BasicEffectRulePlugin("generator"),
	new BasicEffectRulePlugin("layer"),
	new UseEffectRulePlugin()
]);

class NormalModuleFactory extends ModuleFactory {
	/**
	 * @param {Object} param params
	 * @param {string=} param.context context
	 * @param {InputFileSystem} param.fs file system
	 * @param {ResolverFactory} param.resolverFactory resolverFactory
	 * @param {ModuleOptions} param.options options
	 * @param {Object=} param.associatedObjectForCache an object to which the cache will be attached
	 * @param {boolean=} param.layers enable layers
	 */
	constructor({
		context, // webpack.options.contxt：路径上下文
		fs, // 读取文件系统 - 封装 Node 的 fs 模块
		resolverFactory,
		options, // webpack.options.module 配置项 - 用来处理模块的配置
		associatedObjectForCache, // 根编译器
		layers = false
	}) {
		super();
		this.hooks = Object.freeze({
			/**
			 * resolve 钩子：在请求被解析之前调用。可以通过返回 false 来忽略依赖项。返回一个模块实例将结束进程。否则，返回 undefined 以继续。
			 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
			 */
			/** @type {AsyncSeriesBailHook<[ResolveData], TODO>} */
			resolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {HookMap<AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>>} */
			resolveForScheme: new HookMap(
				() => new AsyncSeriesBailHook(["resourceData", "resolveData"])
			),
			/** @type {HookMap<AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>>} */
			resolveInScheme: new HookMap(
				() => new AsyncSeriesBailHook(["resourceData", "resolveData"])
			),
			/**
			 * factorize 钩子：在初始化解析之前调用。它应该返回 undefined 以继续。
			 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
			 */
			/** @type {AsyncSeriesBailHook<[ResolveData], TODO>} */
			factorize: new AsyncSeriesBailHook(["resolveData"]),
			/**
			 * beforeResolve 钩子：当遇到新的依赖项请求时调用。可以通过返回 false 来忽略依赖项。否则，返回 undefined 以继续。
			 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
			 * 可以在这个钩子中来忽略一些模块的构建
			 */
			/** @type {AsyncSeriesBailHook<[ResolveData], TODO>} */
			beforeResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<[ResolveData], TODO>} */
			afterResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<[ResolveData["createData"], ResolveData], TODO>} */
			createModule: new AsyncSeriesBailHook(["createData", "resolveData"]),
			/** @type {SyncWaterfallHook<[Module, ResolveData["createData"], ResolveData], TODO>} */
			module: new SyncWaterfallHook(["module", "createData", "resolveData"]),
			createParser: new HookMap(() => new SyncBailHook(["parserOptions"])),
			parser: new HookMap(() => new SyncHook(["parser", "parserOptions"])),
			createGenerator: new HookMap(
				() => new SyncBailHook(["generatorOptions"])
			),
			generator: new HookMap(
				() => new SyncHook(["generator", "generatorOptions"])
			)
		});
		this.resolverFactory = resolverFactory; // 解析器工厂方法
		this.ruleSet = ruleSetCompiler.compile([
			{
				rules: options.defaultRules
			},
			{
				rules: options.rules
			}
		]);
		this.context = context || ""; // 
		this.fs = fs;
		this._globalParserOptions = options.parser;
		this._globalGeneratorOptions = options.generator;
		/** @type {Map<string, WeakMap<Object, TODO>>} */
		this.parserCache = new Map(); // parser(解析模块为 ast)的缓存
		/** @type {Map<string, WeakMap<Object, Generator>>} */
		this.generatorCache = new Map(); // generator(模版生成时提供方法)的缓存
		/** @type {Set<Module>} */
		this._restoredUnsafeCacheEntries = new Set();

		const cacheParseResource = parseResource.bindCache(
			associatedObjectForCache
		);

		// NormalModuleFactory.factorize：在初始化解析之前调用 -- https://webpack.docschina.org/api/normalmodulefactory-hooks/#factorize
		this.hooks.factorize.tapAsync(
			{
				name: "NormalModuleFactory",
				stage: 100
			},
			(resolveData, callback) => {
				/**
				 * resolve 钩子：在请求被解析之前调用。可以通过返回 false 来忽略依赖项。返回一个模块实例将结束进程。否则，返回 undefined 以继续。
				 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
				 * 主要是在下面就会注册这个钩子事件，在下面的钩子事件中，会对模块进行初步解析，生成创建模块实例的所需数据，
				 * 生成对象在 resolveData.createData 中，主要如下属性：
				 * 	parser：主要作用是为该 module 提供 parser，用于解析模块为 ast。
				 * 	generator：主要作用是为该 module 提供 generator，用于模版生成时提供方法。
				 * 	loaders：该模块需要运用的 loader
				 */
				this.hooks.resolve.callAsync(resolveData, (err, result) => {
					if (err) return callback(err);

					// Ignored 可以通过返回 false 来忽略依赖项。
					if (result === false) return callback();

					// direct module 返回一个模块实例将结束进程。
					if (result instanceof Module) return callback(null, result);

					if (typeof result === "object")
						throw new Error(
							deprecationChangedHookMessage("resolve", this.hooks.resolve) +
								" Returning a Module object will result in this module used as result." // 返回模块对象将导致此模块用作结果
						);
					
					/**
					 * afterResolve 钩子：在请求解析后调用。
					 */
					this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
						if (err) return callback(err);

						// 返回对象的话，直接抛出错误
						if (typeof result === "object")
							throw new Error(
								deprecationChangedHookMessage(
									"afterResolve",
									this.hooks.afterResolve
								)
							);

						// Ignored 返回 false，忽略这个模块
						if (result === false) return callback();

						/**
						 * 该模块的相关信息，为创建模块实例提供各种必备的环境条件，在 hooks.resolve 钩子事件(在下方)中会解析出来
						 * 主要如下属性：
				 		 * 	parser：主要作用是为该 module 提供 parser，用于解析模块为 ast。
				 		 * 	generator：主要作用是为该 module 提供 generator，用于模版生成时提供方法。
				 		 * 	loaders：该模块需要运用的 loader
						 *  request: 模块解析路径(结合了 loader 的路径) -- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\00_process\\node_modules\\babel-loader\\lib\\index.js??ruleSet[1].rules[1].use!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\00_process\\node_modules\\eslint-loader\\dist\\cjs.js??ruleSet[1].rules[0]!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\00_process\\src\\index.js"
						 * 	resource: 模块的绝对路径(不包含 loader) -- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\00_process\\src\\index.js"
						 */
						const createData = resolveData.createData;

						// createModule：在创建 NormalModule 实例之前调用 -- 内部没有注册这个钩子
						this.hooks.createModule.callAsync(
							createData,
							resolveData,
							(err, createdModule) => {
								// 如果这个钩子返回了一个模块实例的话，就使用返回的模块实例，否则就根据模块数据创建这个模块的实例
								if (!createdModule) {
									// 没有模块需要处理的话
									if (!resolveData.request) {
										return callback(new Error("Empty dependency (no request)")); // 空依赖项（无请求）
									}

									// 根据 createData 信息创建模块实例(NormalModule) -- 实例化时不做具体操作，只是实例化这个模块的数据
									createdModule = new NormalModule(createData);
								}

								// module 钩子：在创建 NormalModule 实例后调用。
								createdModule = this.hooks.module.call(
									createdModule, // 模块实例
									createData, // 创建模块的数据
									resolveData
								);
								
								// 得到模块对象后，通过 callback 回调抛出这个模块
								return callback(null, createdModule);
							}
						);
					});
				});
			}
		);
		// 注册 NormalModuleFactory.resolve 钩子：在请求被解析之前调用。可以通过返回 false 来忽略依赖项。返回一个模块实例将结束进程。否则，返回 undefined 以继续。
		/**
		 * 在下面的 resolve 钩子中，会处理该模块的相关信息，为创建模块实例提供各种必备的环境条件
		 * 	loaders：使用的 loader 集合
		 * 	parser：用于解析模块为 ast -- 后续解析模块使用
		 * 	generator：用于模版生成时提供方法 -- 后续解析模块使用
		 * 	。。。
		 */
		this.hooks.resolve.tapAsync(
			{
				name: "NormalModuleFactory",
				stage: 100
			},
			(data, callback) => {
				// 提取这个模块的数据
				const {
					contextInfo, // 模块其他上下文信息
					context, // 模块的上下文路径，用于解析模块路径
					dependencies, // 用于描述这个模块的依赖对象列表
					dependencyType, // 一个依赖类别，典型的类别是"commonjs"， "amd"， "esm"
					request, // 模块请求路径 - 对示例而言，就是 './module/module01'
					assertions,
					resolveOptions, // 加载配置项
					fileDependencies,
					missingDependencies,
					contextDependencies
				} = data;
				// 获取 loader 的解析器：用于解析 loader
				const loaderResolver = this.getResolver("loader");

				/** @type {ResourceData | undefined} */
				let matchResourceData = undefined;
				/** @type {string} */
				let unresolvedResource;
				/** @type {{loader: string, options: string|undefined}[]} */
				let elements;
				let noPreAutoLoaders = false;
				let noAutoLoaders = false;
				let noPrePostAutoLoaders = false;

				const contextScheme = getScheme(context);
				/** @type {string | undefined} */
				let scheme = getScheme(request);

				if (!scheme) {
					/** @type {string} */
					let requestWithoutMatchResource = request;
					const matchResourceMatch = MATCH_RESOURCE_REGEX.exec(request);
					if (matchResourceMatch) {
						let matchResource = matchResourceMatch[1];
						if (matchResource.charCodeAt(0) === 46) {
							// 46 === ".", 47 === "/"
							const secondChar = matchResource.charCodeAt(1);
							if (
								secondChar === 47 ||
								(secondChar === 46 && matchResource.charCodeAt(2) === 47)
							) {
								// if matchResources startsWith ../ or ./
								matchResource = join(this.fs, context, matchResource);
							}
						}
						matchResourceData = {
							resource: matchResource,
							...cacheParseResource(matchResource)
						};
						requestWithoutMatchResource = request.substr(
							matchResourceMatch[0].length
						);
					}

					scheme = getScheme(requestWithoutMatchResource);

					if (!scheme && !contextScheme) {
						const firstChar = requestWithoutMatchResource.charCodeAt(0);
						const secondChar = requestWithoutMatchResource.charCodeAt(1);
						noPreAutoLoaders = firstChar === 45 && secondChar === 33; // startsWith "-!"
						noAutoLoaders = noPreAutoLoaders || firstChar === 33; // startsWith "!"
						noPrePostAutoLoaders = firstChar === 33 && secondChar === 33; // startsWith "!!";
						const rawElements = requestWithoutMatchResource
							.slice(
								noPreAutoLoaders || noPrePostAutoLoaders
									? 2
									: noAutoLoaders
									? 1
									: 0
							)
							.split(/!+/);
						unresolvedResource = rawElements.pop();
						elements = rawElements.map(identToLoaderRequest);
						scheme = getScheme(unresolvedResource);
					} else {
						unresolvedResource = requestWithoutMatchResource;
						elements = EMPTY_ELEMENTS;
					}
				} else {
					unresolvedResource = request;
					elements = EMPTY_ELEMENTS;
				}

				const resolveContext = {
					fileDependencies,
					missingDependencies,
					contextDependencies
				};

				/** @type {ResourceDataWithData} */
				let resourceData;

				let loaders;

				const continueCallback = needCalls(2, err => {
					if (err) return callback(err);

					// translate option idents
					try {
						for (const item of loaders) {
							if (typeof item.options === "string" && item.options[0] === "?") {
								const ident = item.options.substr(1);
								if (ident === "[[missing ident]]") {
									throw new Error(
										"No ident is provided by referenced loader. " +
											"When using a function for Rule.use in config you need to " +
											"provide an 'ident' property for referenced loader options."
									);
								}
								item.options = this.ruleSet.references.get(ident);
								if (item.options === undefined) {
									throw new Error(
										"Invalid ident is provided by referenced loader"
									);
								}
								item.ident = ident;
							}
						}
					} catch (e) {
						return callback(e);
					}

					if (!resourceData) {
						// ignored
						return callback(null, dependencies[0].createIgnoredModule(context));
					}

					const userRequest =
						(matchResourceData !== undefined
							? `${matchResourceData.resource}!=!`
							: "") +
						stringifyLoadersAndResource(loaders, resourceData.resource);

					const settings = {};
					const useLoadersPost = [];
					const useLoaders = [];
					const useLoadersPre = [];

					// handle .webpack[] suffix
					let resource;
					let match;
					if (
						matchResourceData &&
						typeof (resource = matchResourceData.resource) === "string" &&
						(match = /\.webpack\[([^\]]+)\]$/.exec(resource))
					) {
						settings.type = match[1];
						matchResourceData.resource = matchResourceData.resource.slice(
							0,
							-settings.type.length - 10
						);
					} else {
						settings.type = "javascript/auto";
						const resourceDataForRules = matchResourceData || resourceData;
						const result = this.ruleSet.exec({
							resource: resourceDataForRules.path,
							realResource: resourceData.path,
							resourceQuery: resourceDataForRules.query,
							resourceFragment: resourceDataForRules.fragment,
							scheme,
							assertions,
							mimetype: matchResourceData
								? ""
								: resourceData.data.mimetype || "",
							dependency: dependencyType,
							descriptionData: matchResourceData
								? undefined
								: resourceData.data.descriptionFileData,
							issuer: contextInfo.issuer,
							compiler: contextInfo.compiler,
							issuerLayer: contextInfo.issuerLayer || ""
						});
						for (const r of result) {
							if (r.type === "use") {
								if (!noAutoLoaders && !noPrePostAutoLoaders) {
									useLoaders.push(r.value);
								}
							} else if (r.type === "use-post") {
								if (!noPrePostAutoLoaders) {
									useLoadersPost.push(r.value);
								}
							} else if (r.type === "use-pre") {
								if (!noPreAutoLoaders && !noPrePostAutoLoaders) {
									useLoadersPre.push(r.value);
								}
							} else if (
								typeof r.value === "object" &&
								r.value !== null &&
								typeof settings[r.type] === "object" &&
								settings[r.type] !== null
							) {
								settings[r.type] = cachedCleverMerge(settings[r.type], r.value);
							} else {
								settings[r.type] = r.value;
							}
						}
					}

					let postLoaders, normalLoaders, preLoaders;

					const continueCallback = needCalls(3, err => {
						if (err) {
							return callback(err);
						}
						const allLoaders = postLoaders;
						if (matchResourceData === undefined) {
							for (const loader of loaders) allLoaders.push(loader);
							for (const loader of normalLoaders) allLoaders.push(loader);
						} else {
							for (const loader of normalLoaders) allLoaders.push(loader);
							for (const loader of loaders) allLoaders.push(loader);
						}
						for (const loader of preLoaders) allLoaders.push(loader);
						let type = settings.type;
						const resolveOptions = settings.resolve;
						const layer = settings.layer;
						if (layer !== undefined && !layers) {
							return callback(
								new Error(
									"'Rule.layer' is only allowed when 'experiments.layers' is enabled"
								)
							);
						}
						try {
							Object.assign(data.createData, {
								layer:
									layer === undefined ? contextInfo.issuerLayer || null : layer,
								request: stringifyLoadersAndResource(
									allLoaders,
									resourceData.resource
								),
								userRequest,
								rawRequest: request,
								loaders: allLoaders,
								resource: resourceData.resource,
								context:
									resourceData.context || getContext(resourceData.resource),
								matchResource: matchResourceData
									? matchResourceData.resource
									: undefined,
								resourceResolveData: resourceData.data,
								settings,
								type,
								parser: this.getParser(type, settings.parser),
								parserOptions: settings.parser,
								generator: this.getGenerator(type, settings.generator),
								generatorOptions: settings.generator,
								resolveOptions
							});
						} catch (e) {
							return callback(e);
						}
						callback();
					});
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoadersPost,
						loaderResolver,
						resolveContext,
						(err, result) => {
							postLoaders = result;
							continueCallback(err);
						}
					);
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoaders,
						loaderResolver,
						resolveContext,
						(err, result) => {
							normalLoaders = result;
							continueCallback(err);
						}
					);
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoadersPre,
						loaderResolver,
						resolveContext,
						(err, result) => {
							preLoaders = result;
							continueCallback(err);
						}
					);
				});

				this.resolveRequestArray(
					contextInfo,
					contextScheme ? this.context : context,
					elements,
					loaderResolver,
					resolveContext,
					(err, result) => {
						if (err) return continueCallback(err);
						loaders = result;
						continueCallback();
					}
				);

				const defaultResolve = context => {
					if (/^($|\?)/.test(unresolvedResource)) {
						resourceData = {
							resource: unresolvedResource,
							data: {},
							...cacheParseResource(unresolvedResource)
						};
						continueCallback();
					}

					// resource without scheme and with path
					else {
						const normalResolver = this.getResolver(
							"normal",
							dependencyType
								? cachedSetProperty(
										resolveOptions || EMPTY_RESOLVE_OPTIONS,
										"dependencyType",
										dependencyType
								  )
								: resolveOptions
						);
						this.resolveResource(
							contextInfo,
							context,
							unresolvedResource,
							normalResolver,
							resolveContext,
							(err, resolvedResource, resolvedResourceResolveData) => {
								if (err) return continueCallback(err);
								if (resolvedResource !== false) {
									resourceData = {
										resource: resolvedResource,
										data: resolvedResourceResolveData,
										...cacheParseResource(resolvedResource)
									};
								}
								continueCallback();
							}
						);
					}
				};

				// resource with scheme
				if (scheme) {
					resourceData = {
						resource: unresolvedResource,
						data: {},
						path: undefined,
						query: undefined,
						fragment: undefined,
						context: undefined
					};
					this.hooks.resolveForScheme
						.for(scheme)
						.callAsync(resourceData, data, err => {
							if (err) return continueCallback(err);
							continueCallback();
						});
				}

				// resource within scheme
				else if (contextScheme) {
					resourceData = {
						resource: unresolvedResource,
						data: {},
						path: undefined,
						query: undefined,
						fragment: undefined,
						context: undefined
					};
					this.hooks.resolveInScheme
						.for(contextScheme)
						.callAsync(resourceData, data, (err, handled) => {
							if (err) return continueCallback(err);
							if (!handled) return defaultResolve(this.context);
							continueCallback();
						});
				}

				// resource without scheme and without path
				else defaultResolve(context);
			}
		);
	}

	cleanupForCache() {
		for (const module of this._restoredUnsafeCacheEntries) {
			ChunkGraph.clearChunkGraphForModule(module);
			ModuleGraph.clearModuleGraphForModule(module);
			module.cleanupForCache();
		}
	}

	/**
	 * @param {ModuleFactoryCreateData} data data object 数据对象
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback 回调
	 * @returns {void}
	 * 	以在 ./src/index.js 中导入 index.css 文件为例
	 */
	/**
	 * 最终在这里启动创建模块实例 -- 会从入口点开始解析，递归解析所有的依赖文件，最后会将每个依赖项都生成一个模块实例
	 * 大致流程为解析模块信息，解析需要的 loaders、parser 等信息，new NormalModule 构造模块实例，以及其他模块相关信息，将其返回
	 * 
	 * --> 1. 在 ./Compilation 的 _factorizeModule 的方法中调用 factory.create() 启动构建这个模块
	 * --> 2. 封装一些数据后，执行 NormalModuleFactory.hooks.beforeResolve 钩子 -- webpack 没有注册这个钩子，直接执行回调
	 * --> 3. 在 beforeResolve 钩子回调中，执行 NormalModuleFactory.hooks.factorize 钩子 -- 在初始化 NormalModuleFactory 时注册了这个钩子(在上方 constructor 初始化时)
	 * 	--> 3.1. 在 hooks.factorize 钩子事件中，直接执行 NormalModuleFactory.hooks.resolve 钩子 -- 在初始化 NormalModuleFactory 时注册了这个钩子(在上方 constructor 初始化时)
	 * 		--> 3.1.1 在 resolve 钩子事件中(即 constructor 初始化注册的事件)，提取出会处理该模块的相关信息，为创建模块实例提供各种必备的环境条件(loaders：使用的 loader 集合、parser：用于解析模块为 ast -- 后续解析模块使用、generator：用于模版生成时提供方法 -- 后续解析模块使用。。。)
	 * 	--> 3.2 resolve 钩子事件执行完毕，提取出模块相关信息，接着执行 NormalModuleFactory.hooks.resolve 钩子的回调
	 * 		--> 3.2.1 在 resolve 钩子回调中，接着执行 NormalModuleFactory.hooks.afterResolve 钩子 -- webpack 内部没有注册这个钩子，直接执行回调
	 * 		--> 3.2.2 在 afterResolve 钩子回调中，执行 NormalModuleFactory.hooks.createModule -- webpack 内部没有注册这个钩子，直接执行回调
	 * 		--> 3.2.3 在 createModule 钩子回调中，根据第四步 resolve 钩子中提取的模块信息，调用 new NormalModule(createData) 生成模块信息，在这里只是初始化一些模块信息
	 * 							 接着执行 NormalModuleFactory.hooks.module 钩子 -- webpack 中用于处理模块其他问题，这里常规模块不会使用
	 * 		--> 3.2.4 至此，我们根据模块信息创建了模块实例，将这个模块实例通过 callback 跳出第 3 步注册的 factorize 事件(即 constructor 初始化注册的事件)
	 * --> 4. NormalModuleFactory.hooks.factorize 钩子事件执行完毕，执行这个钩子回调，就在 create 方法内部
	 * --> 5. 初始化模块完毕，组装模块实例以及其他相关信息，执行 callback 回调跳出 cretae 方法，会回到 ./Compilation 的 _factorizeModule 的方法中
	 */
	/**
	 * 例如：在入口文件中(./src/index.js 中)引用了 import { test, test2 } from './module/module01'
	 * 		此时 dependencies 中就存在三个依赖，其中第一个是表示 './module/module01' 的，其他两个表示引用了该模块的 test、test2 方法，猜测用于 Tree Shaking 功能
	 */
	create(data, callback) {
		// 依赖项 - 需要解析的模块
		const dependencies = /** @type {ModuleDependency[]} */ (data.dependencies);
		// 模块的上下文路径 -- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src"
		const context = data.context || this.context;
		const resolveOptions = data.resolveOptions || EMPTY_RESOLVE_OPTIONS;
		// 当前需要解析的模块：在 dependencies 文件夹中处理各种模块，表示该模块的相关信息
		const dependency = dependencies[0]; // 模块信息对象(描述该模块基本信息) - 依赖项第一项表示该模块的信息，其他项有其他作用
		const request = dependency.request; // 模块请求路径 - 对示例而言，就是 './module/module01'
		const assertions = dependency.assertions;
		const contextInfo = data.contextInfo; // 模块其他上下文信息
		const fileDependencies = new LazySet(); 
		const missingDependencies = new LazySet();
		const contextDependencies = new LazySet();
		 // 一个依赖类别，典型的类别是"commonjs"， "amd"， "esm"
		const dependencyType =
			(dependencies.length > 0 && dependencies[0].category) || "";
		/** @type {ResolveData} */
		// 当前模块的封装数据
		const resolveData = {
			contextInfo, // 模块其他上下文信息
			resolveOptions,
			context, // 模块的上下文路径，用于解析模块路径
			request, // 模块请求路径 - 对示例而言，就是 './module/module01'
			assertions,
			dependencies, // 用于描述这个模块的依赖对象列表
			dependencyType, // 一个依赖类别，典型的类别是"commonjs"， "amd"， "esm"
			fileDependencies,
			missingDependencies,
			contextDependencies,
			createData: {},
			cacheable: true // 是否缓存标识
		};
		/**
		 * beforeResolve 钩子：当遇到新的依赖项请求时调用。可以通过返回 false 来忽略依赖项。否则，返回 undefined 以继续。
		 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
		 * 可以在这个钩子中来忽略一些模块的构建
		 */
		this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
			// 出现错误，错误处理
			if (err) {
				return callback(err, {
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: false
				});
			}

			// Ignored 忽略 -- 注册的钩子返回了 false，忽略这个模块的构建
			if (result === false) {
				return callback(null, {
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: resolveData.cacheable
				});
			}

			// 返回了 object 类型的话，抛出错误，不允许返回 object 类型
			if (typeof result === "object")
				throw new Error(
					deprecationChangedHookMessage(
						"beforeResolve",
						this.hooks.beforeResolve
					)
				);

			/**
			 * factorize 钩子：在初始化解析之前调用。它应该返回 undefined 以继续。
			 * AsyncSeriesBailHook 钩子：异步串行，当钩子事件存在返回值后阻断执行
			 * 主要是在最上面的构造器中会注册这个钩子，控制权转移在上方方法
			 */
			this.hooks.factorize.callAsync(resolveData, (err, module) => {
				// 如果存在错误的话，返回构建模块失败信息
				if (err) {
					return callback(err, {
						fileDependencies,
						missingDependencies,
						contextDependencies,
						cacheable: false
					});
				}

				// 模块构建结果 -- 下面的都是标识模块的信息
				const factoryResult = {
					module, // 模块实例
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: resolveData.cacheable // 是否缓存模块
				};

				// 初始化模块完毕，执行 callback 回调跳出 cretae 方法
				callback(null, factoryResult);
			});
		});
	}

	resolveResource(
		contextInfo,
		context,
		unresolvedResource,
		resolver,
		resolveContext,
		callback
	) {
		resolver.resolve(
			contextInfo,
			context,
			unresolvedResource,
			resolveContext,
			(err, resolvedResource, resolvedResourceResolveData) => {
				if (err) {
					return this._resolveResourceErrorHints(
						err,
						contextInfo,
						context,
						unresolvedResource,
						resolver,
						resolveContext,
						(err2, hints) => {
							if (err2) {
								err.message += `
An fatal error happened during resolving additional hints for this error: ${err2.message}`;
								err.stack += `

An fatal error happened during resolving additional hints for this error:
${err2.stack}`;
								return callback(err);
							}
							if (hints && hints.length > 0) {
								err.message += `
${hints.join("\n\n")}`;
							}
							callback(err);
						}
					);
				}
				callback(err, resolvedResource, resolvedResourceResolveData);
			}
		);
	}

	_resolveResourceErrorHints(
		error,
		contextInfo,
		context,
		unresolvedResource,
		resolver,
		resolveContext,
		callback
	) {
		asyncLib.parallel(
			[
				callback => {
					if (!resolver.options.fullySpecified) return callback();
					resolver
						.withOptions({
							fullySpecified: false
						})
						.resolve(
							contextInfo,
							context,
							unresolvedResource,
							resolveContext,
							(err, resolvedResource) => {
								if (!err && resolvedResource) {
									const resource = parseResource(resolvedResource).path.replace(
										/^.*[\\/]/,
										""
									);
									return callback(
										null,
										`Did you mean '${resource}'?
BREAKING CHANGE: The request '${unresolvedResource}' failed to resolve only because it was resolved as fully specified
(probably because the origin is strict EcmaScript Module, e. g. a module with javascript mimetype, a '*.mjs' file, or a '*.js' file where the package.json contains '"type": "module"').
The extension in the request is mandatory for it to be fully specified.
Add the extension to the request.`
									);
								}
								callback();
							}
						);
				},
				callback => {
					if (!resolver.options.enforceExtension) return callback();
					resolver
						.withOptions({
							enforceExtension: false,
							extensions: []
						})
						.resolve(
							contextInfo,
							context,
							unresolvedResource,
							resolveContext,
							(err, resolvedResource) => {
								if (!err && resolvedResource) {
									let hint = "";
									const match = /(\.[^.]+)(\?|$)/.exec(unresolvedResource);
									if (match) {
										const fixedRequest = unresolvedResource.replace(
											/(\.[^.]+)(\?|$)/,
											"$2"
										);
										if (resolver.options.extensions.has(match[1])) {
											hint = `Did you mean '${fixedRequest}'?`;
										} else {
											hint = `Did you mean '${fixedRequest}'? Also note that '${match[1]}' is not in 'resolve.extensions' yet and need to be added for this to work?`;
										}
									} else {
										hint = `Did you mean to omit the extension or to remove 'resolve.enforceExtension'?`;
									}
									return callback(
										null,
										`The request '${unresolvedResource}' failed to resolve only because 'resolve.enforceExtension' was specified.
${hint}
Including the extension in the request is no longer possible. Did you mean to enforce including the extension in requests with 'resolve.extensions: []' instead?`
									);
								}
								callback();
							}
						);
				},
				callback => {
					if (
						/^\.\.?\//.test(unresolvedResource) ||
						resolver.options.preferRelative
					) {
						return callback();
					}
					resolver.resolve(
						contextInfo,
						context,
						`./${unresolvedResource}`,
						resolveContext,
						(err, resolvedResource) => {
							if (err || !resolvedResource) return callback();
							const moduleDirectories = resolver.options.modules
								.map(m => (Array.isArray(m) ? m.join(", ") : m))
								.join(", ");
							callback(
								null,
								`Did you mean './${unresolvedResource}'?
Requests that should resolve in the current directory need to start with './'.
Requests that start with a name are treated as module requests and resolve within module directories (${moduleDirectories}).
If changing the source code is not an option there is also a resolve options called 'preferRelative' which tries to resolve these kind of requests in the current directory too.`
							);
						}
					);
				}
			],
			(err, hints) => {
				if (err) return callback(err);
				callback(null, hints.filter(Boolean));
			}
		);
	}

	resolveRequestArray(
		contextInfo,
		context,
		array,
		resolver,
		resolveContext,
		callback
	) {
		if (array.length === 0) return callback(null, array);
		asyncLib.map(
			array,
			(item, callback) => {
				resolver.resolve(
					contextInfo,
					context,
					item.loader,
					resolveContext,
					(err, result) => {
						if (
							err &&
							/^[^/]*$/.test(item.loader) &&
							!/-loader$/.test(item.loader)
						) {
							return resolver.resolve(
								contextInfo,
								context,
								item.loader + "-loader",
								resolveContext,
								err2 => {
									if (!err2) {
										err.message =
											err.message +
											"\n" +
											"BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.\n" +
											`                 You need to specify '${item.loader}-loader' instead of '${item.loader}',\n` +
											"                 see https://webpack.js.org/migrate/3/#automatic-loader-module-name-extension-removed";
									}
									callback(err);
								}
							);
						}
						if (err) return callback(err);

						const parsedResult = identToLoaderRequest(result);
						const resolved = {
							loader: parsedResult.loader,
							options:
								item.options === undefined
									? parsedResult.options
									: item.options,
							ident: item.options === undefined ? undefined : item.ident
						};
						return callback(null, resolved);
					}
				);
			},
			callback
		);
	}

	// 获取指定类型(例如：javascript/auto等)的 parser(用于解析模块为 ast)
	getParser(type, parserOptions = EMPTY_PARSER_OPTIONS) {
		let cache = this.parserCache.get(type); // 根据类型 type 提取缓存

		if (cache === undefined) {
			cache = new WeakMap();
			this.parserCache.set(type, cache); // 不存在缓存的话，先初始化 type 类型缓存
		}

		let parser = cache.get(parserOptions); // 从类型缓存中提取出对应 parserOptions 的配置项

		if (parser === undefined) {
			// 不存在缓存，创建 parser
			parser = this.createParser(type, parserOptions);
			cache.set(parserOptions, parser);
		}

		return parser;
	}

	/**
	 * 创建 parser 解析器，用于生成模块 ast
	 * @param {string} type type
	 * @param {{[k: string]: any}} parserOptions parser options
	 * @returns {Parser} parser
	 */
	createParser(type, parserOptions = {}) {
		parserOptions = mergeGlobalOptions(
			this._globalParserOptions,
			type,
			parserOptions
		);
		const parser = this.hooks.createParser.for(type).call(parserOptions);
		if (!parser) {
			throw new Error(`No parser registered for ${type}`);
		}
		this.hooks.parser.for(type).call(parser, parserOptions);
		return parser;
	}

	// 获取指定类型(例如：javascript/auto等)的 generator(用于模版生成时提供方法。)
	getGenerator(type, generatorOptions = EMPTY_GENERATOR_OPTIONS) {
		let cache = this.generatorCache.get(type);

		if (cache === undefined) {
			cache = new WeakMap();
			this.generatorCache.set(type, cache);
		}

		let generator = cache.get(generatorOptions);

		if (generator === undefined) {
			generator = this.createGenerator(type, generatorOptions);
			cache.set(generatorOptions, generator);
		}

		return generator;
	}
	// 创建 generator 解析器，用于模版生成时提供方法。
	createGenerator(type, generatorOptions = {}) {
		generatorOptions = mergeGlobalOptions(
			this._globalGeneratorOptions,
			type,
			generatorOptions
		);
		const generator = this.hooks.createGenerator
			.for(type)
			.call(generatorOptions);
		if (!generator) {
			throw new Error(`No generator registered for ${type}`);
		}
		this.hooks.generator.for(type).call(generator, generatorOptions);
		return generator;
	}

	// 获取指定类型(loader、模块)的解析器
	getResolver(type, resolveOptions) {
		return this.resolverFactory.get(type, resolveOptions);
	}
}

module.exports = NormalModuleFactory;
