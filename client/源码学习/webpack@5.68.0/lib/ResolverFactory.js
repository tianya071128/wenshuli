/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Factory = require("enhanced-resolve").ResolverFactory;
const { HookMap, SyncHook, SyncWaterfallHook } = require("tapable");
const {
	cachedCleverMerge,
	removeOperations,
	resolveByProperty
} = require("./util/cleverMerge");

/** @typedef {import("enhanced-resolve").ResolveOptions} ResolveOptions */
/** @typedef {import("enhanced-resolve").Resolver} Resolver */
/** @typedef {import("../declarations/WebpackOptions").ResolveOptions} WebpackResolveOptions */
/** @typedef {import("../declarations/WebpackOptions").ResolvePluginInstance} ResolvePluginInstance */

/** @typedef {WebpackResolveOptions & {dependencyType?: string, resolveToContext?: boolean }} ResolveOptionsWithDependencyType */
/**
 * @typedef {Object} WithOptions
 * @property {function(Partial<ResolveOptionsWithDependencyType>): ResolverWithOptions} withOptions create a resolver with additional/different options
 */

/** @typedef {Resolver & WithOptions} ResolverWithOptions */

// need to be hoisted on module level for caching identity
const EMPTY_RESOLVE_OPTIONS = {};

/**
 * @param {ResolveOptionsWithDependencyType} resolveOptionsWithDepType enhanced options
 * @returns {ResolveOptions} merged options
 */
const convertToResolveOptions = resolveOptionsWithDepType => {
	const { dependencyType, plugins, ...remaining } = resolveOptionsWithDepType;

	// check type compat
	/** @type {Partial<ResolveOptions>} */
	const partialOptions = {
		...remaining,
		plugins:
			plugins &&
			/** @type {ResolvePluginInstance[]} */ (
				plugins.filter(item => item !== "...")
			)
	};

	if (!partialOptions.fileSystem) {
		throw new Error(
			"fileSystem is missing in resolveOptions, but it's required for enhanced-resolve" // 文件系统在resolve选项中缺失，但它需要增强的解析
		);
	}
	// These weird types validate that we checked all non-optional properties 这些奇怪的类型验证了我们检查了所有非可选属性
	const options =
		/** @type {Partial<ResolveOptions> & Pick<ResolveOptions, "fileSystem">} */ (
			partialOptions
		);

	return removeOperations(
		resolveByProperty(options, "byDependency", dependencyType)
	);
};

/**
 * @typedef {Object} ResolverCache
 * @property {WeakMap<Object, ResolverWithOptions>} direct
 * @property {Map<string, ResolverWithOptions>} stringified
 */

module.exports = class ResolverFactory /** 解析器工厂 */ {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncWaterfallHook<[ResolveOptionsWithDependencyType]>>} */
			// HookMap 模块：可以动态的添加钩子，这些钩子是传入的工厂方法返回的
			// SyncWaterfallHook：同步钩子，瀑布钩子会将上一个函数的返回值传递给下一个函数作为参数 
			resolveOptions: new HookMap(
				() => new SyncWaterfallHook(["resolveOptions"])
			),
			/** @type {HookMap<SyncHook<[Resolver, ResolveOptions, ResolveOptionsWithDependencyType]>>} */
			resolver: new HookMap(
				() => new SyncHook(["resolver", "resolveOptions", "userResolveOptions"])
			)
		});
		/** @type {Map<string, ResolverCache>} */
		this.cache = new Map(); 
	}

	/**
	 * @param {string} type type of resolver 需要哪种类型的解析器
	 * @param {ResolveOptionsWithDependencyType=} resolveOptions options
	 * @returns {ResolverWithOptions} the resolver 返回解析器
	 */
	get(type, resolveOptions = EMPTY_RESOLVE_OPTIONS) {
		/** 
		 * 缓存系统：首先根据 type 类型进行缓存(例如：loader等等)
		 * 					在根据 resolveOptions 进行缓存(因为加载配置项不同，解析结果也会不同)
		 */
		let typedCaches = this.cache.get(type); // 尝试从缓存中提取
		// 不存在缓存的话
		if (!typedCaches) {
			typedCaches = {
				direct: new WeakMap(),
				stringified: new Map()
			};
			this.cache.set(type, typedCaches); // 进行缓存
		}
		const cachedResolver = typedCaches.direct.get(resolveOptions); // 根据解析配置项提取这个类型(type)的缓存
		if (cachedResolver) {
			// 存在缓存则直接返回缓存内容
			return cachedResolver;
		}
		const ident = JSON.stringify(resolveOptions); // 进行序列化
		const resolver = typedCaches.stringified.get(ident); // 根据配置项序列化提取出这个类型(type)的缓存
		if (resolver) {
			// 存在缓存的话，将其缓存添加到 direct 项
			typedCaches.direct.set(resolveOptions, resolver);
			// 并返回缓存
			return resolver;
		}
		/** 缓存系统 end */

		// 不存在缓存，则初始化
		const newResolver = this._create(type, resolveOptions);
		typedCaches.direct.set(resolveOptions, newResolver); // 并将生成的解析器进行缓存
		typedCaches.stringified.set(ident, newResolver);
		return newResolver;
	}

	/**
	 * @param {string} type type of resolver 需要创建解析器的类型
	 * @param {ResolveOptionsWithDependencyType} resolveOptionsWithDepType options
	 * @returns {ResolverWithOptions} the resolver
	 */
	_create(type, resolveOptionsWithDepType) {
		/** @type {ResolveOptionsWithDependencyType} */
		const originalResolveOptions = { ...resolveOptionsWithDepType }; // 源解析器配置项

		// 综合 webpack.options[type] 配置项和 resolveOptionsWithDepType 配置项生成解析器配置项
		const resolveOptions = convertToResolveOptions(
			this.hooks.resolveOptions.for(type).call(resolveOptionsWithDepType)
		);
		const resolver = /** @type {ResolverWithOptions} */ (
			Factory.createResolver(resolveOptions)
		);
		if (!resolver) {
			throw new Error("No resolver created"); // 没有创建解析器
		} 
		/** @type {WeakMap<Partial<ResolveOptionsWithDependencyType>, ResolverWithOptions>} */
		const childCache = new WeakMap();
		resolver.withOptions = options => {
			const cacheEntry = childCache.get(options);
			if (cacheEntry !== undefined) return cacheEntry;
			const mergedOptions = cachedCleverMerge(originalResolveOptions, options);
			const resolver = this.get(type, mergedOptions);
			childCache.set(options, resolver);
			return resolver;
		};
		this.hooks.resolver
			.for(type)
			.call(resolver, resolveOptions, originalResolveOptions);
		return resolver;
	}
};
