---
title: 输出(output)
date: 2021-10-21 15:00:00
permalink: /webpack/output
categories: -- 工程化
  -- 输出
tags:
  - null
---

# 输出(output)

`output` 指示 webpack 如何去输出、以及在哪里输出你的「bundle、asset 和其他你所打包或使用 webpack 载入的任何内容」。

**即使可以存在多个 `entry` 起点，但只能指定一个 `output` 配置。**

## 配置

[详细配置见官网](https://webpack.docschina.org/configuration/output/)，这里只看下常见配置

### output.path：输出目录

此选项决定了 webpack 输出目录，应该是一个绝对路径。**配置相对路径会导致编译错误**

```js
const path = require('path');

module.exports = {
  //...
  output: {
    path: path.resolve(__dirname, 'dist/assets'),
  },
};
```

### output.filename：同步文件名

此选项决定了每个输出 bundle 的名称。会将其写入到 `output.path` 选项指定的目录下。

注意：

1. 当通过多个入口起点(entry point)、代码拆分(code splitting)或各种插件(plugin)创建多个 bundle，应该使用模板化文件名，来赋予每个 bundle 一个唯一的名称

   ```js
   module.exports = {
     filename: '[name].[contenthash].js',
   }
   ```

2. 可以使用像 `'js/[name].[contenthash].js'` 这样的文件夹结构。这样就是输出到一个文件夹 `js` 中

3. **注意：**它只影响最初加载的输出文件

   * 对于「按需加载 chunk」的输出文件，请使用 [`output.chunkFilename`](https://webpack.docschina.org/configuration/output/#outputchunkfilename) 选项来控制输出。

     但是默认会使用 `output.filename` 配置

   * 对于 loader 创建的文件也不受影响，必须尝试 loader 特定的可用选项。

   * 对于一些 plugin 生成的文件，则需要具体根据 plugin 选项

### output.chunkFilename：异步文件名

此选项决定了非初始（non-initial）chunk 文件的名称。默认值为 `[id].js`或从 `output.filename` 推断出来(有条件推断)

注意：

1. 使用 `[id]` 时，在 `development` 环境下是目录和文件名拼接的 `src_chunk_chunk01_js`，而在 `production` 模式下，则是以数字来分配。

2. 与 `filename` 类似，也可以使用像 `'chunkjs/[name].[contenthash].js'` 这样的文件夹结构

3. 还有一些其他的配置项，用于配置「按需加载 chunk」：

   * `output.chunkLoadTimeout `：chunk 请求到期之前的毫秒数，默认为 120000。

     ```js
     /* 加载 chunk 时默认使用的是 jsonp */
     script = document.createElement('script');
     script.timeout = 120; // 兼容性不高，后面还会使用 setTimeout 兼容
     script.src = url;
     
     // 同时使用定时器兼容
     var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
     ```

   * `output.chunkLoadingGlobal`：webpack 用于加载 chunk 的全局变量。

     ```js
     /* webpack 配置 */
     module.exports = {
       output: {
         chunkLoadingGlobal: 'myCustomFunc', // 此时影响生成 chunk 的全局变量
       }
     }
     
     /* 这是一个生成的「按需加载 chunk」 */
     (self["myCustomFunc"] = self["myCustomFunc"] || []).push([["src_chunk_chunk01_js"],[])
     ```

   * `output.chunkLoading`：加载 chunk 的方法（默认值有 'jsonp' (web)，'importScripts' (WebWorker)，'require' (sync node.js)，'async-node' (async node.js)，还有其他值可由插件添加)。

     ```js
     /* jsonp 方式大致如下 */
     __webpack_require__.l = (url, done, key, chunkId) => {
     	if(inProgress[url]) { inProgress[url].push(done); return; }
     	var script, needAttach;
     	if(key !== undefined) {
     		var scripts = document.getElementsByTagName("script");
     		for(var i = 0; i < scripts.length; i++) {
     			var s = scripts[i];
     			if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
     		}
     	}
     	if(!script) {
     		needAttach = true;
     		script = document.createElement('script');
     /******/ 		
     		script.charset = 'utf-8';
     		script.timeout = 60;
     		if (__webpack_require__.nc) {
     			script.setAttribute("nonce", __webpack_require__.nc);
     		}
     		script.setAttribute("data-webpack", dataWebpackPrefix + key);
     		script.src = url;
     	}
     	inProgress[url] = [done];
     	var onScriptComplete = (prev, event) => {
     		// avoid mem leaks in IE.
     		script.onerror = script.onload = null;
     		clearTimeout(timeout);
     		var doneFns = inProgress[url];
     		delete inProgress[url];
     		script.parentNode && script.parentNode.removeChild(script);
     		doneFns && doneFns.forEach((fn) => (fn(event)));
     		if(prev) return prev(event);
     	}
     	;
     	var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 60000);
     	script.onerror = onScriptComplete.bind(null, script.onerror);
     	script.onload = onScriptComplete.bind(null, script.onload);
     	needAttach && document.head.appendChild(script);
     };
     ```

## 替换模板字符串-生成文件名

webpack 提供了一种使用称为 **substitution(可替换模板字符串)** 的方式，通过带括号字符串来模板化文件名。

**webpack 内部通过内置插件 [`TemplatedPathPlugin`](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/TemplatedPathPlugin.js) 来实现，具体见源码注释**
