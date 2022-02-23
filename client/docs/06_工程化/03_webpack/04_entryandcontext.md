---
title: 入口和上下文
date: 2021-10-21 15:00:00
permalink: /webpack/entryandcontext
categories: -- 工程化
  -- entryandcontext
tags:
  - null
---

# 入口和上下文

## 入口

**入口起点(entry point)** 指示 webpack 应该使用哪个模块，来作为构建其内部 [依赖图(dependency graph)](https://webpack.docschina.org/concepts/dependency-graph/) 的开始。进入入口起点后，webpack 会找出有哪些模块和库是入口起点（直接和间接）依赖的。

从 [_入口_](https://webpack.docschina.org/concepts/entry-points/) 开始，webpack 会递归的构建一个 _依赖关系图_，这个依赖图包含着应用程序中所需的每个模块，然后将所有模块打包为少量的 _bundle_ —— 通常只有一个 —— 可由浏览器加载。

### 入口(entry)配置

[配置签名](https://github.com/webpack/webpack/blob/main/declarations/WebpackOptions.d.ts)：

```tsx
// 对象形式
interface EntryStaticNormalized {
  [k: string]: string | string[] | EntryDescriptionNormalized;
}

/**
 * An object with entry point description. 具有入口点描述的对象
 */
export interface EntryDescriptionNormalized {
	/**
	 * Enable/disable creating async chunks that are loaded on demand. 启用/禁用创建按需加载的异步块
	 */
	asyncChunks?: boolean;
	/**
	 * Base uri for this entry. 此条目的基本uri
	 */
	baseUri?: string;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 * 加载块的方法（默认情况下包括的方法有'jsonp'（web）、'import'（ESM）、'importScripts'（WebWorker）、'require'（sync node.js）、'async node'（async node.js），但其他方法可能由插件添加）。
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 * 当前入口点所依赖的入口点。必须在加载此入口点时加载它们
	 */
	dependOn?: string[];
	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 * 指定磁盘上输出文件的文件名。您必须**不**在此处指定绝对路径，但该路径可能包含以“/”分隔的文件夹！指定的路径与“输出”的值联接。“路径”选项来确定磁盘上的位置
	 */
	filename?: Filename;
	/**
	 * Module(s) that are loaded upon startup. The last one is exported. 启动时加载的模块。最后一个是出口
	 */
	import?: string[];
	/**
	 * Specifies the layer in which modules of this entrypoint are placed. 指定放置此入口点模块的图层
	 */
	layer?: Layer;
	/**
	 * Options for library. library 的 Options
	 */
	library?: LibraryOptions;
	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 * “publicPath”指定在浏览器中引用时输出文件的公共URL地址
	 */
	publicPath?: PublicPath;
	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 * 运行时块的名称。如果创建了一个具有此名称的运行时块，或者将现有入口点用作运行时块
	 */
	runtime?: EntryRuntime;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 * 加载WebAssembly模块的方法（默认情况下包括的方法有'fetch'（web/WebWorker）、'async node'（node.js），但其他方法可能由插件添加）。
	 */
	wasmLoading?: WasmLoading;
}

type Entry = string | string[] | EntryStaticNormalized;

let entry: Entry | (() => Entry);
```

如上述配置签名可知，可以从如下两个维度来区分入口配置

#### 1. 从入口描述值来区分：

* 字符串形式：`chunk` 会被命名为 `main`，此时从入口文件为起点，打包所有的模块根据配置生成 `bundle`

  ```js
  module.exports = {
    entry: './src/index.js',
  };
  
  // 或者
  module.exports = {
    entry: {
      main: './src/index.js',
    },
  };
  ```

* 字符串数组形式：此时会处理数组中所有的模块，会通过这些模块构建依赖图生成 `bundle`。

  ```js
  module.exports = {
    entry: ['./src/index2.js', './src/index.js']
  }
  
  // 或者
  module.exports = {
    entry: {
      main: ['./src/index2.js', './src/index.js']
    }
  }
  ```

  **数组的这些模块文件都会在初始时执行**，如下简单示例生成的 `bundle` 所示：

  ::: details 点击查看

  ```js
  // 需要其他模块引用的模块
  var __webpack_modules__ = {
    './src/module/module01.js': () => {
      console.log('这是一个模块');
    },
  };
  
  // entry 数组中第一个文件，首先执行
  (() => {
    'use strict';
    /*!***********************!*\
    !*** ./src/index2.js ***!
    \***********************/
    console.log('传入了字符串数组入口时的操作');
  })();
  
  // entry 数组中第二个文件，执行
  (() => {
    'use strict';
    /*!**********************!*\
    !*** ./src/index.js ***!
    \**********************/
    console.log('入口文件');
  })();
  ```

  :::

* 对象形式(webpack5 新增)：用于描述入口的对象，这是应用程序中定义入口的最可扩展的方式。**配置更为丰富**

  ```tsx
  // 配置签名
  interface EntryValueObj {
    import: string | [string]; // 启动时需加载的模块
    // 当前入口所依赖的入口(类似于 DllPlugin 和 DllReferencePlugin 插件作用)。它们必须在该入口被加载前被加载
    dependOn: string | [string];
    // 默认取 output.filename 的值，但可指定要输出的文件名称，优先级更高
    filename: string;
    // 其他配置见官网配置
    [otherConfig: string]: any
  }
  ```

#### 2. 从入口数量来区分：

一般而言，单页应用(SPA)：一个入口起点。多页应用(MPA)：多个入口起点。

* 单个入口起点：就是使用上述形式(字符串、字符串数组或者一个描述符(descriptor))来定义一个入口

* 多个入口起点：

  * 有时也可在 单页应用(SPA) 中定义多个入口，使用 [enter.dependOn](https://webpack.docschina.org/configuration/entry-context/#dependencies) 方式连接两个入口的 `bundle`

    ```js
    module.exports = {
      entry: {
        entry3_01: {
          import: './src/index.js',
          dependOn: 'entry3_02', // 连接 entry3_02 入口
        },
        entry3_02: './src/index2.js',
      }
    }
    ```

  * 大多数是使用在多页应用(MPA)上，配置 [HtmlWebpackPlugin](https://webpack.docschina.org/plugins/html-webpack-plugin) 插件使用

    ```js
    module.exports = {
      entry: {
        entry4: './src/index.js',
        entry5: './src/index2.js',
      },
    }
    ```

### webpack 如何处理入口？

#### 1. 标准化 entry 配置

处理配置项(options)，在这一步会处理传入的 `entry` 选项，组装成特定格式数据：

`entry: { [entryKey: string]: EntryDescriptionNormalized }`

[EntryDescriptionNormalized 参考](/webpack/entryandcontext/#入口-entry-配置)：

```js
/* 初始化 compiler -- webpack/lib/webpack.js */
const createCompiler = rawOptions => {
	// 获取标准化后的配置项
	const options = getNormalizedWebpackOptions(rawOptions);
  // ...
};

/** 标准化配置项 -- webpack/lib/config/normalization.js */
const getNormalizedWebpackOptions = config => {
	return {
		context: config.context,
		devtool: config.devtool,
    // 标准化 entry
		entry:
			config.entry === undefined
				? { main: {} } // 默认值
				: typeof config.entry === "function" // 如果是函数，调用函数获取 entry
				? (
						fn => () =>
							Promise.resolve().then(fn).then(getNormalizedEntryStatic)
				  )(config.entry)
				: getNormalizedEntryStatic(config.entry), // 常规情况处理 entry
    // 其他配置项。。。
	};
};

/** 规范化 entry，组装成特定数据格式(见入口配置对象签名) -- webpack/lib/config/normalization.js  */
const getNormalizedEntryStatic = entry => {
	/**
	 * 如果是字符串形式：entry: './src/index.js'
	 */
	if (typeof entry === "string" ) {
		return {
			main: { // 标准化为对象形式，key 默认为 main
				import: [entry]
			}
		};
	}
	/**
	 * 如果是数组形式：entry: ['./src/index2.js', './src/index.js']
	 */
	if (Array.isArray(entry)) {
		return {
			main: { // 也标准化为对象形式，key 同样默认为 main 
				import: entry
			}
		};
	}
	/**
	 * 排除字符串形式和数组形式，接下来就是对象形式
	 */
	/** @type {EntryStaticNormalized} */
	const result = {};
	for (const key of Object.keys(entry)) { /* 遍历对象的 key */
		const value = entry[key]; // 提取对象属性值
		// 属性值为字符串
		if (typeof value === "string") {
			result[key] = {
				import: [value]
			};
		} else if (Array.isArray(value)) {
			// 属性值为数组
			result[key] = {
				import: value
			};
		} else {
			// 属性值为对象，此时标准化为 EntryStaticNormalized 数据格式
			result[key] = {
				import:
					value.import &&
					(Array.isArray(value.import) ? value.import : [value.import]),
				filename: value.filename,
				layer: value.layer,
				runtime: value.runtime,
				publicPath: value.publicPath,
				chunkLoading: value.chunkLoading,
				asyncChunks: value.asyncChunks,
				wasmLoading: value.wasmLoading,
				dependOn:
					value.dependOn &&
					(Array.isArray(value.dependOn) ? value.dependOn : [value.dependOn]),
				library: value.library
			};
		}
	}
	return result;
};
```



## 上下文(context)

上下文是入口文件所处的目录的绝对路径的字符串，用于从配置中解析入口点(entry point)和 加载器(loader)。

默认使用 Node.js 进程的当前工作目录，但是推荐在配置中传入一个值。这使得你的配置独立于 CWD(current working directory, 当前工作目录)。

```js
const path = require('path');

module.exports = {
  //...
  context: path.resolve(__dirname, 'app'),
};
```

