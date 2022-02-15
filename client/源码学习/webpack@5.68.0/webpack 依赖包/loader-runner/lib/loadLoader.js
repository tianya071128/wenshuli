var LoaderLoadingError = require("./LoaderLoadingError");
var url;

// 加载 loader 文件内容 - 兼容加载失败处理
module.exports = function loadLoader(loader, callback) {
	if(loader.type === "module") {
		try {
			if(url === undefined) url = require("url");
			var loaderUrl = url.pathToFileURL(loader.path);
			var modulePromise = eval("import(" + JSON.stringify(loaderUrl.toString()) + ")");
			modulePromise.then(function(module) {
				handleResult(loader, module, callback);
			}, callback);
			return;
		} catch(e) {
			callback(e);
		}
	} else {
		try {
			var module = require(loader.path); // 加载 loader 文件信息
		} catch(e) {
			// it is possible for node to choke on a require if the FD descriptor 如果FD描述符
			// limit has been reached. give it a chance to recover. 已达到极限。给它一个恢复的机会。
			if (e instanceof Error && e.code === "EMFILE") {
				// 大致意思是，如果是读取文件失败的情况(FD描述符已达到极限)，此时异步的在尝试加载一次
				var retry = loadLoader.bind(null, loader, callback);
				if(typeof setImmediate === "function") {
					// node >= 0.9.0
					return setImmediate(retry);
				} else {
					// node < 0.9.0
					return process.nextTick(retry);
				}
			}
			return callback(e);
		}
		return handleResult(loader, module, callback); // 在经过 handleResult 处理一下 loader 文件内容
	}
};
// 处理 loader 文件内容 -- 提取出注册的 loader、pitch、raw loader 信息，通过引用类型的特性，直接改变函数入参
function handleResult(loader, module, callback) {
	// 如果 loader 注册的不是函数 或者 不是 object 形式， 那么注册异常，抛出错误
	if(typeof module !== "function" && typeof module !== "object") {
		return callback(new LoaderLoadingError(
			"Module '" + loader.path + "' is not a loader (export function or es6 module)" // 模块 不是加载程序（导出功能或es6模块）
		));
	}
	loader.normal = typeof module === "function" ? module : module.default; // loader 执行方法
	loader.pitch = module.pitch; // 是否注册了 Pitching 阶段执行的方法
	loader.raw = module.raw; // 将 raw 设置为 true，表示接收的是原始的 Buffer
	if(typeof loader.normal !== "function" && typeof loader.pitch !== "function") {
		return callback(new LoaderLoadingError(
			"Module '" + loader.path + "' is not a loader (must have normal or pitch function)" // 不是装载机（必须具有正常或变桨功能）
		));
	}
	callback();
}
