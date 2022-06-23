/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/* globals __webpack_hash__ */
/**
 * hot 功能：
 * 	不管是使用 webapck-dev-serve，还是使用 webpack-dev-middleware，或者自定义服务器，最终都要有如下操作启用 hot 功能：
 * 		1. 注册这个 HotModuleReplacementPlugin 插件，这个插件会做如下工作：可以查看“编译后的代码”相关图片就可以理解一些
 * 				1.1 影响编译结果，会在重新构建时增加几个编译文件：
 * 						--> 生成一个 [runtime].[fullhash].hot-update.json(由 output.hotUpdateMainFilename 配置)，这个文件会被客户端请求，表示重新构建受影响的 chunk
 * 									{ "c": ["main", "runtime"], "r": [], "m": [] }，客户端根据这些信息去请求对应的文件(如下文件)
 * 						--> 根据受影响的 chunk 生成 [id].[fullhash].hot-update.js(output.hotUpdateChunkFilename 配置)
 * 									---> main.933f7613cc817f3e136c.hot-update.js    这里是一些变动的模块，客户端请求到后就会进行模块替换等操作
 * 									---> runtime.933f7613cc817f3e136c.hot-update.js
 * 				1.2 增加一些运行时代码到生成的 runtime chunk 中，这些运行时代码主要影响 module 对象，增加一个 module.hot 对象，主要是 hot 相关 API，主要在 lib/hmr/HotModuleReplacement.runtime.js 文件中
 * 		2. 添加如下两个入口，如果是在 webpack-dev-serve 中会自动插入：
 * 				2.1 'webpack-dev-server/client/index.js?hot=true&live-reload=true' ：会在重新构建完毕后，接收到构建完成信号后，通过 hotEmitter 发送 webpackHotUpdate 事件，并传递编译 hash 参数，此时就会交给 webapck/hot/dev-server.js 进行处理进行 hot
 * 				2.2 'webpack/hot/dev-server.js'：通过 hotEmitter，注册 webpackHotUpdate 事件，就会在上面入口处理接收到构建完成信号，之后逻辑详见文件
 */


if (module.hot) {
	var lastHash; // 上次编译的 hash
	var upToDate = function upToDate() {
		return lastHash.indexOf(__webpack_hash__) >= 0;
	};
	var log = require("./log");
	var check = function check() {
		// 调用 module.hot.check 进行检查，这个方法定义在 lib/hmr/HotModuleReplacement.runtime.js 文件中
		module.hot
			.check(true)
			.then(function (updatedModules) {
				if (!updatedModules) {
					log("warning", "[HMR] Cannot find update. Need to do a full reload!");
					log(
						"warning",
						"[HMR] (Probably because of restarting the webpack-dev-server)"
					);
					window.location.reload();
					return;
				}

				if (!upToDate()) {
					check();
				}

				require("./log-apply-result")(updatedModules, updatedModules);

				if (upToDate()) {
					log("info", "[HMR] App is up to date.");
				}
			})
			.catch(function (err) {
				var status = module.hot.status();
				if (["abort", "fail"].indexOf(status) >= 0) {
					log(
						"warning",
						"[HMR] Cannot apply update. Need to do a full reload!"
					);
					log("warning", "[HMR] " + log.formatError(err));
					window.location.reload();
				} else {
					log("warning", "[HMR] Update failed: " + log.formatError(err));
				}
			});
	};
	var hotEmitter = require("./emitter");
	// 注册 webpackHotUpdate 事件，表明需要进行 hot
	hotEmitter.on("webpackHotUpdate", function (currentHash) {
		lastHash = currentHash; // 当次编译的 hash
		// 这些条件？？
		if (!upToDate() && module.hot.status() === "idle") { 
			log("info", "[HMR] Checking for updates on the server..."); // [HMR] 检查服务器上的更新
			check(); // 检查服务器上进行的更新
		}
	});
	log("info", "[HMR] Waiting for update signal from WDS..."); // [HMR]等待WDS更新信号
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled."); // [HMR] 禁用“更换热模块”
}
