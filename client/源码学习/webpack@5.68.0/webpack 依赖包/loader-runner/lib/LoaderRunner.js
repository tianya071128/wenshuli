/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var readFile = fs.readFile.bind(fs);
var loadLoader = require("./loadLoader");

// Buffer 转化为 string
function utf8BufferToString(buf) {
	var str = buf.toString("utf-8");
	// 0xFEFF -- ''
	if(str.charCodeAt(0) === 0xFEFF) {
		return str.substr(1);
	} else {
		return str;
	}
}

const PATH_QUERY_FRAGMENT_REGEXP = /^((?:\0.|[^?#\0])*)(\?(?:\0.|[^#\0])*)?(#.*)?$/;

/**
 * @param {string} str the path with query and fragment
 * @returns {{ path: string, query: string, fragment: string }} parsed parts
 */
function parsePathQueryFragment(str) {
	var match = PATH_QUERY_FRAGMENT_REGEXP.exec(str);
	return {
		path: match[1].replace(/\0(.)/g, "$1"),
		query: match[2] ? match[2].replace(/\0(.)/g, "$1") : "",
		fragment: match[3] || ""
	};
}

// 提取出指定 path 的目录路径 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src
function dirname(path) {
	if(path === "/") return "/";
	var i = path.lastIndexOf("/");
	var j = path.lastIndexOf("\\");
	var i2 = path.indexOf("/");
	var j2 = path.indexOf("\\");
	var idx = i > j ? i : j;
	var idx2 = i > j ? i2 : j2;
	if(idx < 0) return path;
	if(idx === idx2) return path.substr(0, idx + 1);
	return path.substr(0, idx);
}

// 重新组装下 loader，组装成对象形式
function createLoaderObject(loader) {
	var obj = {
		path: null,
		query: null,
		fragment: null,
		options: null,
		ident: null,
		normal: null,
		pitch: null,
		raw: null,
		data: null,
		pitchExecuted: false,
		normalExecuted: false
	};
	Object.defineProperty(obj, "request", {
		enumerable: true,
		get: function() {
			return obj.path.replace(/#/g, "\0#") + obj.query.replace(/#/g, "\0#") + obj.fragment;
		},
		set: function(value) {
			if(typeof value === "string") {
				var splittedRequest = parsePathQueryFragment(value);
				obj.path = splittedRequest.path;
				obj.query = splittedRequest.query;
				obj.fragment = splittedRequest.fragment;
				obj.options = undefined;
				obj.ident = undefined;
			} else {
				if(!value.loader)
					throw new Error("request should be a string or object with loader and options (" + JSON.stringify(value) + ")");
				obj.path = value.loader;
				obj.fragment = value.fragment || "";
				obj.type = value.type;
				obj.options = value.options;
				obj.ident = value.ident;
				if(obj.options === null)
					obj.query = "";
				else if(obj.options === undefined)
					obj.query = "";
				else if(typeof obj.options === "string")
					obj.query = "?" + obj.options;
				else if(obj.ident)
					obj.query = "??" + obj.ident;
				else if(typeof obj.options === "object" && obj.options.ident)
					obj.query = "??" + obj.options.ident;
				else
					obj.query = "?" + JSON.stringify(obj.options);
			}
		}
	});
	obj.request = loader;
	if (Object.preventExtensions) {
		// Object.preventExtensions()方法让一个对象变的不可扩展，也就是永远不能再添加新的属性。
		Object.preventExtensions(obj);
	}
	return obj;
}

// 执行同步或异步 loader -- 包含 pitch 阶段和 normal 阶段需要执行的方法 -- 在这里就是 fn 执行回调
function runSyncOrAsync(fn, context, args, callback) {
	var isSync = true; // 是否为同步 loader
	var isDone = false; // 
	var isError = false; // internal error 内部错误 -- webpack 错误
	var reportedError = false;
	// 告诉 loader-runner 这个 loader 将会异步地回调。返回 this.callback。
	context.async = function async() {
		if (isDone) { 
			// 如果这个 loader 已经执行完毕
			if(reportedError) return; // ignore
			throw new Error("async(): The callback was already called."); // async(): 已调用回调
		}
		isSync = false; // 标识为异步 loader
		return innerCallback; // 返回 this.callback -- 可以同步或者异步调用的并返回多个结果的函数。
	};
	// 可以同步或者异步调用的并返回多个结果的函数 -- 如果执行了这个方法，表示这个 loader 已经结束调用
	var innerCallback = context.callback = function() {
		if (isDone) {
			// 如果这个 loader 已经执行完毕
			if(reportedError) return; // ignore
			throw new Error("callback(): The callback was already called."); // callback(): 已调用回调
		}
		isDone = true; // 执行完毕 laoder 标识
		isSync = false; // 如果执行了这个回调 - 不管是异步还是同步，都在这里处理结果
		try {
			callback.apply(null, arguments); // 将调用 contect.callback 执行结果返回
		} catch(e) {
			isError = true; // 内部处理
			throw e;
		}
	};
	try {
		// 执行 loader 方法，获取返回值
		var result = (function LOADER_EXECUTION() {
			/**
			 * 在 pitch 阶段，这个 args 比较固定，就是没有执行的 loader、执行过的 loader、共享的 data 对象。
			 * 在 normal 阶段，这个 args 一般为处理模块的内容或 Buffer 数据
			 */
			return fn.apply(context, args); // 执行 fn，即执行 loader 的 pitch 阶段或 normal 阶段，传递 args 参数
		}());
		// 处理一下直接返回结果的 loader，调用 context.callback 返回结果的在上面处理
		if(isSync) {
			isDone = true; // 加载完成
			if(result === undefined)
				return callback(); // 什么都没有返回，直接返回
			// 处理 promise 结果
			if(result && typeof result === "object" && typeof result.then === "function") {
				return result.then(function(r) {
					callback(null, r);
				}, callback);
			}
			return callback(null, result); // 其他情况，返回 loader 处理结果
		}
	} catch(e) {
		if(isError) throw e; // 如果是内部处理，抛出错误
		if(isDone) {
			// loader is already "done", so we cannot use the callback function 加载器已经“完成”，所以我们不能使用回调函数
			// for better debugging we print the error on the console 为了更好地调试，我们在控制台上打印错误
			if(typeof e === "object" && e.stack) console.error(e.stack);
			else console.error(e);
			return;
		}
		isDone = true;
		reportedError = true;
		callback(e);
	}

}

// 如果 raw(接收原始的 Buffer) 为 true，则将其内容转化为 Buffer
// 如果为 false，将则内容转化为 string
function convertArgs(args, raw) {
	if(!raw && Buffer.isBuffer(args[0]))
		args[0] = utf8BufferToString(args[0]);
	else if(raw && typeof args[0] === "string")
		args[0] = Buffer.from(args[0], "utf-8");
}

/**
 * 将 loaders 从开始到末尾顺序loader
 * 	1. 加载 loader 模块，提取出 loader 数据(normal 阶段执行方法、pitch 阶段执行方法、raw 标识)
 * 	2. 执行 pitch 阶段，如果 pitch 阶段返回了数据的话，那么跳过剩下的 loader，直接反过来执行 loader 的 normal 阶段
 *  3. 当所有的 loader 的 pitch 阶段执行完毕，那么启动 processResource 方法
 * 	4. processResource 方法：提取出模块资源(提取为 Buffer)，在调用 iterateNormalLoaders 方法从 loaders 末尾开始执行 normal 阶段
 *  5. 执行所有 loader 的 normal 方法，最后会返回一个 result(Array<content: string | Buffer,sourceMap?: SourceMap,meta?: any>)
 */
function iteratePitchingLoaders(options, loaderContext, callback) {
	// abort after last loader 在最后一个加载器后中止
	// 根据 loaderIndex 当前执行 loader 索引判断是否为最后一个 loader
	if(loaderContext.loaderIndex >= loaderContext.loaders.length)
		return processResource(options, loaderContext, callback); // 如果所有的 loader 都执行了 pitch，启动执行 normal 阶段方法执行

	// 当前 loader 的信息 -- 包含 loader 路径、loader 配置项等等信息
	var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

	// iterate 迭代 -- 如果这个 loader 已经处理 pitch 阶段，那么就直接执行下一个 loader
	if(currentLoaderObject.pitchExecuted) {
		loaderContext.loaderIndex++;
		return iteratePitchingLoaders(options, loaderContext, callback);
	}

	// load loader module 加载 loader 模块
	// loadLoader：方法提取出 loader 的 执行函数、pitch方法、raw标识，这个方法会直接改变 currentLoaderObject 函数入参，所以回调函数没有 result 结果值
	// currentLoaderObject.normal：loader 的执行函数、pitch：laoder 注册的 pitch 函数、raw：loader 是否需要接收原始的 Buffer
	loadLoader(currentLoaderObject, function (err) {
		// 如果 loader 加载出错的话
		if(err) {
			loaderContext.cacheable(false);
			return callback(err);
		}
		var fn = currentLoaderObject.pitch; // 提取出当前 loader 的 pitch 方法
		currentLoaderObject.pitchExecuted = true; // 标识一下这个 loader 已经执行了 pitch 
		if(!fn) return iteratePitchingLoaders(options, loaderContext, callback); // 如果当前 loader 没有注册 pitch 方法，那么直接下一个 loader

		// 执行 loader 的 pitch 阶段方法
		runSyncOrAsync(
			fn, // pitch 执行函数
			loaderContext, // loader 执行上下文
			// 传递给 pitch 方法的参数
			[loaderContext.remainingRequest, // 只读属性- 还没有执行过的 loader 以及处理的模块路径组合成的路径 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\css-loader\\dist\\cjs.js!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.css
				loaderContext.previousRequest, // 已经执行过的 loader 路径合成的
				currentLoaderObject.data = {}], // 在 pitch 阶段和 normal 阶段之间共享的 data 对象。 
			function (err) {
				// 拿到 pitch 阶段方法执行结果
				if(err) return callback(err); // 存在错误，直接返回错误
				var args = Array.prototype.slice.call(arguments, 1); // 提取出除了第一个参数外的全部参数
				// Determine whether to continue the pitching process based on 根据以下信息确定是否继续 pitching 过程：
				// argument values (as opposed to argument presence) in order 参数值（与参数存在相反）的顺序
				// to support synchronous and asynchronous usages. 支持同步和异步使用。
				// 判断 pitch 阶段是否返回了结果
				var hasArg = args.some(function(value) {
					return value !== undefined;
				});
				// 如果某个 loader 在 pitch 方法中给出一个结果，那么这个过程会回过身来，并跳过剩下的 loader。
				// |- a-loader `pitch`
				// 	|- b-loader `pitch` 返回了一些内容 -- 跳过后续的 loader 执行，直接开始执行 normal 阶段
				// |- a-loader normal execution
				if(hasArg) {
					loaderContext.loaderIndex--;
					// 跳过剩下的 loader
					iterateNormalLoaders(options, loaderContext, args, callback);
				} else {
					// 否则继续执行下一个 loader 的 pitch 阶段
					iteratePitchingLoaders(options, loaderContext, callback);
				}
			}
		);
	});
}

// 加载模块的资源(加载为 Buffer)，并执行 iterateNormalLoaders 启动 normal 阶段的执行
function processResource(options, loaderContext, callback) {
	// set loader index to last loader 将加载程序索引设置为最后一个加载程序
	loaderContext.loaderIndex = loaderContext.loaders.length - 1; // normal 

	var resourcePath = loaderContext.resourcePath; // 模块文件的路径：C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.css
	if (resourcePath) {
		// 当存在需要处理的模块时，加载模块资源
		options.processResource(loaderContext, resourcePath, function(err, buffer) {
			if(err) return callback(err); // 当加载资源出错时，直接返回出错信息
			options.resourceBuffer = buffer; // 处理模块的资源(文件内容)
			iterateNormalLoaders(options, loaderContext, [buffer], callback); // 启动 normal 阶段执行
		});
	} else {
		// 不存在需要处理的模块，直接启动 normal 执行
		iterateNormalLoaders(options, loaderContext, [null], callback);
	}
}

/**
 * 执行 loader 的 normal 阶段方法 -- normal 阶段，从 loaders 数组末尾开始调用
 * 这个 args 一开始是 [Buffer] 或 [String]，后面 loader 处理后，可能会存在 sourceMap 和 mets(loader 之间传递数据)
 */
function iterateNormalLoaders(options, loaderContext, args, callback) {
	if(loaderContext.loaderIndex < 0) // 没有执行的 laoder，返回处理结果
		return callback(null, args);

	var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex]; // 当前执行的 loader

	// iterate 迭代 -- 执行下一个 loader
	if(currentLoaderObject.normalExecuted) {
		loaderContext.loaderIndex--;
		return iterateNormalLoaders(options, loaderContext, args, callback); // 继续执行下一个 loader
	}

	var fn = currentLoaderObject.normal; // 提取出 loader normal 阶段执行方法
	currentLoaderObject.normalExecuted = true; // 标识这个 loader 已经执行完毕
	if (!fn) {
		// 如果没有注册 normal 阶段的话，那么就执行下一个 loader
		return iterateNormalLoaders(options, loaderContext, args, callback);
	}

	// 根据 raw 标识来转化 args 参数(string 和 buffer 相互转化)
	convertArgs(args, currentLoaderObject.raw);

	// 执行当前 loader 的 normal 阶段
	runSyncOrAsync(fn, loaderContext, args /** 模块资源(Buufer 或 string) */, function(err) {
		if(err) return callback(err); // 执行出错，抛出错误

		// loader 处理结果一般为：content: string | Buffer, sourceMap?: SourceMap, meta?: any -- https://webpack.docschina.org/api/loaders/#thiscallback
		var args = Array.prototype.slice.call(arguments, 1); // 提取出返回参数
		iterateNormalLoaders(options, loaderContext, args, callback); // 继续执行下一个 loader
	});
}

exports.getContext = function getContext(resource) {
	var path = parsePathQueryFragment(resource).path;
	return dirname(path);
};

/**
 * 启动 loader 构建模块：
 * 	1. 在这个方法中，主要是初始化 loaderContext 的属性，最后执行 iteratePitchingLoaders 方法启动 loaders 的 pitch 阶段
 * 	2. iteratePitchingLoaders 方法执行 loaders 的 pitch 阶段 -- 从 loaders 开始到末尾顺序执行
 * 		  --> 1. 加载 loader 模块，提取出 loader 数据(normal 阶段执行方法、pitch 阶段执行方法、raw 标识)
 * 		  --> 2. 执行 pitch 阶段，如果 pitch 阶段返回了数据的话，那么跳过剩下的 loader，直接反过来执行 loader 的 normal 阶段
 * 			--> 3. 没有返回数据的话，继续执行下一个 loader 的 pitch 方法
 *  	  --> 4. 当所有的 loader 的 pitch 阶段执行完毕，那么启动 processResource 方法
 * 	3. processResource 方法：提取出模块资源(提取为 Buffer)
 *  4. iterateNormalLoaders 方法 -- 从 loaders 末尾到开始顺序执行
 * 			--> 1. 根据 raw 标识，传入模块资源 Buffer 或 string 给 loader 处理
 * 			--> 2. 执行 loader 的 normal 方法，每个 loader 返回如下信息(content: string | Buffer、sourceMap?: SourceMap、meta?: any) -- https://webpack.docschina.org/api/loaders/#thiscallback
 * 			--> 3. 将上一个 loader 的结果返回给下一个需要执行的 loader，最后执行完毕所有的 loader
 * 			--. 4. 最终会得到一个结果 result(Array<content: string | Buffer,sourceMap?: SourceMap,meta?: any>)
 *  5. 回到 iteratePitchingLoaders 执行完毕回调中，处理模块的构建结果，并调用 callback 返回启动位置(NormalModule._doBuild)
 */
exports.runLoaders = function runLoaders(options, callback) {
	// read options 阅读选项
	var resource = options.resource || ""; // 该模块文件路径
	var loaders = options.loaders || []; // 用来处理模块的 loaders
	var loaderContext = options.context || {}; // loader 执行上下文
	var processResource = options.processResource || ((readResource, context, resource, callback) => {
		context.addDependency(resource);
		readResource(resource, callback);
	}).bind(null, options.readResource || readFile);

	//
	var splittedResource = resource && parsePathQueryFragment(resource); // 解析模块文件路径，解析为：{ path: '真实路径', fragment: '', query: '' }
	var resourcePath = splittedResource ? splittedResource.path : undefined; // 模块文件的路径：C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.css
	var resourceQuery = splittedResource ? splittedResource.query : undefined; // 资源的 query 参数(另外一种传递参数给 loader 的方式) -- https://webpack.docschina.org/api/loaders/#thisresourcequery
	var resourceFragment = splittedResource ? splittedResource.fragment : undefined; // 资源的片段 - 类似与 url 的 # 后面的值
	var contextDirectory = resourcePath ? dirname(resourcePath) : null; // 提取出模块文件 path 的目录路径 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src

	// execution state 执行状态
	var requestCacheable = true; // 是否可缓存标志 -- 初始化 laoder 处理结果可缓存
	var fileDependencies = []; // 该模块 loader 处理结果依赖的文件列表 -- https://webpack.docschina.org/api/loaders/#thisadddependency
	var contextDependencies = []; // 该模块 loader 处理结果依赖的目录列表 -- https://webpack.docschina.org/api/loaders/#thisaddcontextdependency
	var missingDependencies = [];

	// prepare loader objects 准备加载程序对象
	// 重新组装下 loader，
	loaders = loaders.map(createLoaderObject);

	// 为 loaderContext 初始化一些属性
	loaderContext.context = contextDirectory; // 模块文件 path 的目录路径
	loaderContext.loaderIndex = 0; // 
	loaderContext.loaders = loaders; // 需要执行的 loader 列表
	loaderContext.resourcePath = resourcePath; // 模块文件的路径
	loaderContext.resourceQuery = resourceQuery; // 资源的 query 参数(另外一种传递参数给 loader 的方式)
	loaderContext.resourceFragment = resourceFragment; // 资源的片段 - 类似与 url 的 # 后面的值
	loaderContext.async = null;
	loaderContext.callback = null;
	loaderContext.cacheable = function cacheable(flag) {
		if(flag === false) {
			requestCacheable = false;
		}
	};
	// 加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到。
	loaderContext.dependency = loaderContext.addDependency = function addDependency(file) {
		fileDependencies.push(file);
	};
	// 添加目录作为 loader 结果的依赖。
	loaderContext.addContextDependency = function addContextDependency(context) {
		contextDependencies.push(context);
	};
	// 
	loaderContext.addMissingDependency = function addMissingDependency(context) {
		missingDependencies.push(context);
	};
	loaderContext.getDependencies = function getDependencies() {
		return fileDependencies.slice();
	};
	loaderContext.getContextDependencies = function getContextDependencies() {
		return contextDependencies.slice();
	};
	loaderContext.getMissingDependencies = function getMissingDependencies() {
		return missingDependencies.slice();
	};
	// 移除 loader 结果的所有依赖，甚至自己和其它 loader 的初始依赖。
	loaderContext.clearDependencies = function clearDependencies() {
		fileDependencies.length = 0;
		contextDependencies.length = 0;
		missingDependencies.length = 0;
		requestCacheable = true;
	};
	// request 中的资源部分，包括 query 参数（eg.'/abc/resource.js?rrr'） -- https://webpack.docschina.org/api/loaders/#thisresource
	Object.defineProperty(loaderContext, "resource", {
		enumerable: true,
		get: function() {
			if(loaderContext.resourcePath === undefined)
				return undefined;
			// 结合文件路径和文件 query 参数和 片段，返回资源部分
			return loaderContext.resourcePath.replace(/#/g, "\0#") + loaderContext.resourceQuery.replace(/#/g, "\0#") + loaderContext.resourceFragment;
		},
		set: function (value) {
			// 设置值时，解析设置值，重新设置 resourcePath、resourceQuery、resourceFragment
			var splittedResource = value && parsePathQueryFragment(value);
			loaderContext.resourcePath = splittedResource ? splittedResource.path : undefined;
			loaderContext.resourceQuery = splittedResource ? splittedResource.query : undefined;
			loaderContext.resourceFragment = splittedResource ? splittedResource.fragment : undefined;
		}
	});
	// 只读属性-被解析出来的 request 字符串 -- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\babel-loader\\lib\\index.js??ruleSet[1].rules[0].use!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js"
	Object.defineProperty(loaderContext, "request", {
		enumerable: true,
		get: function () {
			// 结合所有的 loaders 和 模块文件路径 组装成一个路径：loader路径!loader路径!模块文件路径
			return loaderContext.loaders.map(function(o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});
	// 只读属性- 与 request 类似，但是不包含已经执行完毕的 loaders --"C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js"
	Object.defineProperty(loaderContext, "remainingRequest", {
		enumerable: true,
		get: function () {
			if(loaderContext.loaderIndex >= loaderContext.loaders.length - 1 && !loaderContext.resource)
				return "";
			return loaderContext.loaders.slice(loaderContext.loaderIndex + 1).map(function(o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});
	// 只读属性- 当前执行 loader 与模块文件路径的组装路径 --"C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\babel-loader\\lib\\index.js??ruleSet[1].rules[0].use!C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js"
	Object.defineProperty(loaderContext, "currentRequest", {
		enumerable: true,
		get: function() {
			return loaderContext.loaders.slice(loaderContext.loaderIndex).map(function(o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});
	// 只读属性 - 已经执行过的 loader 的文件路径
	Object.defineProperty(loaderContext, "previousRequest", {
		enumerable: true,
		get: function() {
			
			return loaderContext.loaders.slice(0, loaderContext.loaderIndex).map(function(o) {
				return o.request;
			}).join("!");
		}
	});
	// 当前执行 loader 的配置项(loader.options)
	Object.defineProperty(loaderContext, "query", {
		enumerable: true,
		get: function() {
			var entry = loaderContext.loaders[loaderContext.loaderIndex];
			return entry.options && typeof entry.options === "object" ? entry.options : entry.query;
		}
	});
	// 在 pitch 阶段和 normal 阶段之间共享的 data 对象 -- https://webpack.docschina.org/api/loaders/#thisdata
	Object.defineProperty(loaderContext, "data", {
		enumerable: true,
		get: function() {
			return loaderContext.loaders[loaderContext.loaderIndex].data;
		}
	});

	// finish loader context 完成加载程序上下文
	if(Object.preventExtensions) {
		Object.preventExtensions(loaderContext); // 让一个对象变的不可扩展，也就是永远不能再添加新的属性。
	}

	var processOptions = {
		resourceBuffer: null,
		processResource: processResource
	};
	// 启动执行，先执行 laoder 的 pitch 阶段，后执行 normal 阶段，最后返回一个结果 result(Array<content: string | Buffer,sourceMap?: SourceMap,meta?: any>)
	iteratePitchingLoaders(processOptions, loaderContext, function(err, result) {
		if(err) {
			return callback(err, {
				cacheable: requestCacheable,
				fileDependencies: fileDependencies,
				contextDependencies: contextDependencies,
				missingDependencies: missingDependencies
			});
		}
		callback(null, {
			result: result, // 处理后的结果
			resourceBuffer: processOptions.resourceBuffer, // 原始文件内容
			cacheable: requestCacheable, // 是否缓存标识
			fileDependencies: fileDependencies, // 该 loaders 依赖的文件列表 -- 加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到。
			contextDependencies: contextDependencies, // 依赖目标列表
			missingDependencies: missingDependencies
		});
	});
};
