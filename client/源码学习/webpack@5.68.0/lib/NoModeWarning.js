/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

// 没有设置 mode 配置项的警告类
module.exports = class NoModeWarning extends WebpackError {
	constructor() {
		super();

		this.name = "NoModeWarning";
		this.message =
			"configuration\n" + // 配置
			"The 'mode' option has not been set, webpack will fallback to 'production' for this value.\n" + // 'mode'选项还没有设置，webpack会将这个值回退到'production'
			"Set 'mode' option to 'development' or 'production' to enable defaults for each environment.\n" + // 将“模式”选项设置为“开发”或“生产”，为每个环境启用默认值将“模式”选项设置为“开发”或“生产”，为每个环境启用默认值
			"You can also set it to 'none' to disable any default behavior. " + // 你也可以将它设置为“none”来禁用任何默认行为
			"Learn more: https://webpack.js.org/configuration/mode/";
	}
};
