/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Maksim Nazarjev @acupofspirt
*/

"use strict";

const WebpackError = require("./WebpackError");

module.exports = class ConcurrentCompilationError extends WebpackError {
	constructor() {
		super();

		this.name = "ConcurrentCompilationError";
		this.message =
			"You ran Webpack twice. Each instance only supports a single concurrent compilation at a time."; // 你运行了Webpack两次。每个实例一次只支持一个并发编译
	}
};
