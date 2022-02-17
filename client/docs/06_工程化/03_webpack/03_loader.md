---
title: loader
date: 2021-10-21 15:00:00
permalink: /webpack/loader
categories: -- 工程化
  -- loader
tags:
  - null
---

# loader

webpack 只能理解 js 和 json 文件，`loader` 就是让 webpack 能够去处理其他类型的文件，并将其转换为有效模块，添加到依赖图中。

简单将，`loader` 就是专门用于对模块的源代码进行转换，例如转译 JS(babel)、处理其他文件类型(css、ts、vue)等，**将源代码作为参数传入，并将编译转换后的新代码**

## loader 的配置

通过 [`module.rules`](https://webpack.docschina.org/configuration/module/) 配置 loader，匹配模块的规则数组，这些规则指定模块(module)需要应用的 loader。

每个规则可以分为三部分：条件(condition)，结果(result)和嵌套规则(nested rule)，这三部分指示着模块应用哪些 loader 解析

```js
module: {
  rules: [
    {
      test: /\.m?js$/, // 条件 - 匹配这些文件
      exclude: /(node_modules|bower_components)/, // 条件 - 排除这些文件
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-proposal-object-rest-spread'],
        },
      },
    },
  ],
},
```

* 条件(condition)：决定着该模块是否被匹配

  条件有两种输入值：例如从 `app.js` `导入 './style.css'`

  * resource：资源文件的绝对路径。它已经根据 [`resolve` 规则](https://webpack.docschina.org/configuration/resolve)解析。resource 是 `/path/to/style.css`，表示需要解析的文件

    属性 [`test`](https://webpack.docschina.org/configuration/module/#rule-test), [`include`](https://webpack.docschina.org/configuration/module/#rule-include), [`exclude`](https://webpack.docschina.org/configuration/module/#rule-exclude) 和 [`resource`](https://webpack.docschina.org/configuration/module/#rule-resource) 对 resource 匹配

  * issuer: 请求者的文件绝对路径。是导入时的位置。issuer 是 `/path/to/app.js`，表示导入模块的文件

    属性 [`issuer`](https://webpack.docschina.org/configuration/module/#rule-issuer) 对 issuer 匹配。

* 结果(result)：在条件匹配时应用的 loader 或 Parser 选项

  * 应用的 loader：应用在 resource(资源) 上的 loader 数组。

    > 这些属性会影响 loader：[`loader`](https://webpack.docschina.org/configuration/module/#rule-loader), [`options`](https://webpack.docschina.org/configuration/module/#rule-options-rule-query), [`use`](https://webpack.docschina.org/configuration/module/#rule-use)。
    >
    > 也兼容这些属性：[`query`](https://webpack.docschina.org/configuration/module/#rule-options-rule-query), [`loaders`](https://webpack.docschina.org/configuration/module/#rule-loaders)。
    >
    > [`enforce`](https://webpack.docschina.org/configuration/module/#rule-enforce) 属性会影响 loader 种类。不论是普通的，前置的，后置的 loader。

  * Parser 选项：用于为模块创建解析器的选项对象。

    [`parser`](https://webpack.docschina.org/configuration/module/#rule-parser) 属性会影响 parser 选项。这一部分参考[资源模块指南](https://webpack.docschina.org/guides/asset-modules/) 

* 嵌套规则(nested rule)：在父规则匹配情况下，还可能存在嵌套规则，需要继续匹配嵌套规则

  当匹配了某一个规则时，可能还存在嵌套规则，此时被解析的顺序基于一下规则：

  1. 父规则
  2. [`rules`](https://webpack.docschina.org/configuration/module/#rulerules)
  3. [`oneOf`](https://webpack.docschina.org/configuration/module/#ruleoneof)

  ```js
    module: {
      rules: [
        // 父规则
        {
          test: /\.css$/, // 父规则条件-当条件匹配时，继续匹配嵌套规则
          // oneOf: 只应用第一个匹配的规则 -- 嵌套规则
          oneOf: [
            {
              resourceQuery: /inline/, // foo.css?inline 
              use: 'url-loader',
            },
            {
              resourceQuery: /external/, // foo.css?external
              use: 'file-loader',
            },
          ],
          // 嵌套规则  
          rules: [
            {...}
          ]
        },
      ],
    },
  ```

  

## loader 的种类和调用顺序

loader 通过在 `module.rules.enforce` 配置中指定 loader 种类：

* 普通 loader：没有值表示是普通 loader。
* 后置 loader：`post` 表示后置 loader，在最后调用
* 前置 loader：`pre` 表示前置 loader，最先调用。

以及还有一个额外的种类"行内 loader"，loader 被应用在 import/require 行内。

```js
import Styles from 'style-loader!css-loader?modules!./styles.css';
```

同一种类的 loader 的从右到左（或从下到上）地取值(evaluate)/执行(execute)。

所有一个接一个地进入的 loader，都有两个阶段：

1. **Pitching** 阶段: loader 上的 pitch 方法，按照 `后置(post)、行内(inline)、普通(normal)、前置(pre)` 的顺序调用。更多详细信息，请查看 [Pitching Loader](https://webpack.docschina.org/api/loaders/#pitching-loader)。
2. **Normal** 阶段: loader 上的 常规方法，按照 `前置(pre)、普通(normal)、行内(inline)、后置(post)` 的顺序调用。模块源码的转换， 发生在这个阶段。

```js
|- 后置 loader `pitch`
  |- 行内 loader `pitch`
    |- 普通 loader `pitch`
    	|- 前置 loader `pitch`
      	|- 请求的模块作为依赖项被提取
    	|- 前置 loader 正常执行
    |- 普通 loader 正常执行
  |- 行内 loader 正常执行
|- 后置 loader 正常执行
```

## loader 特性

- loader 支持链式调用。链中的每个 loader 会将转换应用在已处理过的资源上。一组链式的 loader 将按照相反的顺序执行。链中的第一个 loader 将其结果（也就是应用过转换后的资源）传递给下一个 loader，依此类推。最后，链中的最后一个 loader，返回 webpack 所期望的 JavaScript。
- loader 可以是同步的，也可以是异步的。
- loader 运行在 Node.js 中，并且能够执行任何操作。
- loader 可以通过 `options` 对象配置（仍然支持使用 `query` 参数来设置选项，但是这种方式已被废弃）。
- 除了常见的通过 `package.json` 的 `main` 来将一个 npm 模块导出为 loader，还可以在 module.rules 中使用 `loader` 字段直接引用一个模块。
- 插件(plugin)可以为 loader 带来更多特性。
- loader 能够产生额外的任意文件。

可以通过 loader 的预处理函数，为 JavaScript 生态系统提供更多能力。用户现在可以更加灵活地引入细粒度逻辑，例如：压缩、打包、语言转译（或编译）和 [更多其他特性](https://webpack.docschina.org/loaders)。

## 简单 loader 库源码解读



## 浅析 webpack 调用 loader 构建模块流程

### 1. 启动构建模块

1. 在 `Compiler` 构建完成 `Compilation` 时，会执行 [`make` ](https://webpack.docschina.org/api/compiler-hooks/#make)钩子

   ```js
   this.hooks.make.callAsync(compilation, (err) => {...}
   ```

2. webpack 内部会根据 `enter` 入口数量注册相应的 `EntryPlugin` 插件(webpack/lib/EntryPlugin.js)，在这个插件会注册 `compiler.hooks.make` 钩子，用于执行 `compilation.addEntry` 方法从 `entry` 入口文件启动构建

   ```js
   // 注册 compiler.make(compilation 结束之前执行) 钩子
   compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
   	// addEntry：为编译添加入口
   	compilation.addEntry(context, // 入口的上下文路径。
   		dep, // 入口依赖 - 包含着入口路径等信息
   		options, // 入口配置 - 包含着入口名称
   		err => { // 添加入口完成之后回调的函数。
   			callback(err);
   		});
   });
   ```

3. **最终调用 `compilation.addEntry` 方法启动模块构建**，从入口点开始，分解每个请求，解析文件内容以查找进一步的请求，然后通过分解所有请求以及解析新的文件来爬取全部文件。

   ```js
   addEntry(context, entry, optionsOrName, callback) {
   	const options =
   		typeof optionsOrName === "object"
   			? optionsOrName
   			: { name: optionsOrName };
     // 实际通过 _addEntryItem 启动入口处开始构建模块
   	this._addEntryItem(context, entry, "dependencies", options, callback);
   }
   ```

4. 调用 `compilation._addEntryItem` 方法：

   ```js
   const { name } = options; // 入口文件名称
   // 入口相关数据
   let entryData =
   	name !== undefined ? this.entries.get(name) /** 应该是缓存相关 */ : this.globalEntry;
   if (entryData === undefined) {
   	entryData = {
   		dependencies: [],
   		includeDependencies: [],
   		options: {
   			name: undefined,
   			...options
   		}
   	};
   	entryData[target].push(entry);
   	this.entries.set(name, entryData); // 缓存， 根据 name 进行缓存
   } else {
   	...
   }
   // addEntry 钩子 -- 既没有暴露给开发者，webpack 内部也没有使用
   this.hooks.addEntry.call(entry, options);
   // 调用 addModuleTree 方法，这个方法会添加一个模块，并且对这个模块的依赖进行构建
   this.addModuleTree(
   	{
   		context, // 上下文路径 - 'C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader'
   		dependency: entry, // 入口对象
   		contextInfo: entryData.options.layer
   			? { issuerLayer: entryData.options.layer }
   			: undefined
   	},
   	(err, module) => {
   		if (err) {
   			this.hooks.failedEntry.call(entry, options, err);
   			return callback(err);
   		}
   		this.hooks.succeedEntry.call(entry, options, module);
   		return callback(null, module);
   	}
   );
   ```

5. 调用 `compilation.addModuleTree` 构建：

   ```js
   // 如果当前依赖项不符合规范，直接返回错误
   if (
   	typeof dependency !== "object" ||
   	dependency === null ||
   	!dependency.constructor
   ) {
   	return callback(
   		new WebpackError("Parameter 'dependency' must be a Dependency") // 参数“dependency”必须是依赖项
   	);
   }
   const Dep = /** @type {DepConstructor} */ (dependency.constructor); // 当前依赖项对象的构造器
   // 根据依赖项提取出对应的模块构造器 -- 一般而言为 NormalModuleFactory(./NormalModuleFactory.js) 或 ContextModuleFactory
   const moduleFactory = this.dependencyFactories.get(Dep);
   if (!moduleFactory) {
   	return callback(
   		new WebpackError(
   			`No dependency factory available for this dependency type: ${dependency.constructor.name}` // 此依赖项类型没有可
   		)
   	);
   }
   // 真正准备启动构建模块过程
   this.handleModuleCreation(
   	{
   		factory: moduleFactory, // 该模块构造器
   		dependencies: [dependency], // 依赖项
   		originModule: null,
   		contextInfo,
   		context // 上下文路径
   	},
   	(err, result) => {
   		// 回调
   );
   ```

6. 调用 `compilation.handleModuleCreation`: **该方法管理着启动模块实例的创建、模块的 loader 处理、模块的依赖项构建等工作**

   ```js
   handleModuleCreation(
   	{
   		factory, // 该模块构造器
   		dependencies, // 依赖项
   		originModule, // 导入该模块的模块(例如从 ./src/index.js 中 导入 ./test.js，此时就是 ./src/index.js 模块，已经处理好了的)，入口模块为 null
   		contextInfo,
   		context, // 上下文路径 - C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader - 入口模块需要，其他模块不需要
   		recursive = true,
   		connectOrigin = recursive
   	},
   	callback
   ) {
   	const moduleGraph = this.moduleGraph;
   	const currentProfile = this.profile ? new ModuleProfile() : undefined;
   	// 启动创建模块实例方法 -- 模块实例只要是提取出模块的相关信息，例如：loaders、parser、模块路径等信息
   	this.factorizeModule(
   		{
   			currentProfile,
         // 该模块构造器 - https://webpack.docschina.org/api/normalmodulefactory-hooks/
   			factory,
   			dependencies,
   			factoryResult: true,
   			originModule,
   			contextInfo,
   			context
   		},
   		// 模块创建结束，执行回调
   		(err, factoryResult) => {
         //...
   		}
   	);
   }
   ```

### 2. 创建模块实例过程

1. 在上一步，会调用 `compilation.factorizeModule` 方法启动：

   ```js
   // Workaround for typescript as it doesn't support function overloading in jsdoc within a class typescript的变通方法，因为它不支持类内jsdoc中的函数重载
   // 启动创建模块实例(可以用来表示这个模块，例如：loaders、parser、模块路径等信息) - 在内部通过一种运行机制，最终会调用 _factorizeModule 方法进而启动创建流程
   Compilation.prototype.factorizeModule = /** @type {{
   	(options: FactorizeModuleOptions & { factoryResult?: false }, callback: ModuleCallback): void;
   	(options: FactorizeModuleOptions & { factoryResult: true }, callback: ModuleFactoryResultCallback): void;
   }} */ (
   	function (options, callback) {
       // webpack 一种执行机制，略过，直接查看执行 _factorizeModule 方法
   		this.factorizeQueue.add(options, callback);
   	}
   );
   ```

   上述方法在内部通过一种运行机制，最终会调用 _factorizeModule 方法进而启动创建流程

   ```js
   _factorizeModule(
   	{
   		currentProfile,
   		factory, // 该模块构造器(NormalModuleFactory) - https://webpack.docschina.org/api/normalmodulefactory-hooks/
   		dependencies, // 依赖项
   		originModule, // 导入该模块的模块(例如从 ./src/index.js 中 导入 ./test.js，此时就是 ./src/index.js 模块，已经处理好了
   		factoryResult, // 
   		contextInfo,
   		context // 上下文路径 - C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader - 入口模块需要
   	},
   	callback
   ) {
   	if (currentProfile !== undefined) {
   		currentProfile.markFactoryStart();
   	}
   	// 通过 factory.create 启动创建模块实例 - 实际调用的 NormalModuleFactory.create 方法
   	factory.create(
   		{
   			contextInfo: {
   				issuer: originModule ? originModule.nameForCondition() : "",
   				issuerLayer: originModule ? originModule.layer : null,
   				compiler: this.compiler.name,
   				...contextInfo
   			},
   			resolveOptions: originModule ? originModule.resolveOptions : undefined,
   			context: context
   				? context
   				: originModule
   				? originModule.context
   				: this.compiler.context, // 上下文路径 - 如果传入则使用传入的，没有传入从导入模块的 context 取出
   			dependencies: dependencies // 依赖项
   		},
   		// 模式实例化结束回调
   		(err, result) => {
   		}
   	);
   }
   ```

2. 在上一步调用 `factory.create` 方法，实际上流程转到了 `webpack/lib/NormalModuleFactory.js` 的 `create` 中，用于解析模块信息、loaders 信息等信息，创建一个模块实例(后续会针对这个模块实例进行模块的构建)

   这个方法具体执行流程可参考 `NormalModuleFactory.create` [源码解读](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/NormalModuleFactory.js)，总而言之，大致就是：

   * 解析 `inline loader` 和 `resource` 和项目配置的 `loader`，然后根据配置对其进行合并，排序，得到一个 `loaders` 数组
   * 调用 `getParser` 和 `getGenerator` 得到 `module` 对应的 `parser` 和 `generator`，用于后面的 `ast` 解析及模板生成。
   * 结合其他数据，`new NormalModule(createData)` 生成一个模块实例，最终跳出 `create` 方法将这个模块实例 `module` 返回给 `Compilation` 调用地方
   
   `webpack/lib/NormalModuleFactory.js` 的 `create` 方法流程大致如下：
   
   ```js
   	/**
   	 * 最终在这里启动创建模块实例 -- 会从入口点开始解析，递归解析所有的依赖文件，最后会将每个依赖项都生成一个模块实例
   	 * 大致流程为解析模块信息，解析需要的 loaders、parser 等信息，new NormalModule 构造模块实例，以及其他模块相关信息，将其返回
   	 * 
   	 * --> 1. 在 ./Compilation 的 _factorizeModule 的方法中调用 factory.create() 启动构建这个模块
   	 * --> 2. 封装一些数据后，执行 NormalModuleFactory.hooks.beforeResolve 钩子 -- webpack 主要流程中没有注册这个钩子，直接执行回调
   	 * --> 3. 在 beforeResolve 钩子回调中，执行 NormalModuleFactory.hooks.factorize 钩子 -- 在初始化 NormalModuleFactory 时注册了这个钩子(在 constructor 初始化 NormalModuleFactory  时)
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
   ```
   
3. 调用 `NormalModuleFactory.create` 方法结束后，回到 `webpack/lib/Compilation.js` 的 `_factorizeModule` 方法调用 `factory.create` 回调中，做一些模块，在调用回调函数回到

   ```js
   // 通过 factory.create 启动创建模块实例
   factory.create(
   	...,
   	// 模式实例化结束回调
   	(err, result) => {
   		// 。。。 做一些模块方面的处理
     	
   		// 将其模块实例抛出给上一个调用栈
   		callback(null, factoryResult ? result : result.module);
   	}
   );
   ```

4. 在调用 `factory.create` 回调中，经过一系列机制，最终回到 `compilation.handleModuleCreation` 方法调用 `this.factorizeModule` 方法回调中，

   ```js
   handleModuleCreation(
   	...,
   	callback
   ) {
   	...
     // 启动创建模块实例的方法  
   	this.factorizeModule(
   		...,
   		// 模块实例创建结束，执行回调
   		(err, factoryResult) => {
   			... // 做一些模块方面的处理
         
   			// 大致应该是尝试从缓存系统中提取模块，如果存在缓存则使用缓存模块
   			// 不存在缓存，将该 module 推入到 _modules 和 modules 集合中，返回模块
   			// 当然还有其他的一些工作。。。
   			this.addModule(newModule, (err, module) => {
   				...
   				// 在这里，启动编译模块的方法(使用 loaders 编译模块)
   				this._handleModuleBuildAndDependencies(
   					originModule, // 引用该模块的模块实例
   					module, // 模块实例
   					recursive,
   					callback // 构建完毕后的回调
   				);
   			});
   		}
   	);
   }
   ```

### 3. 编译(loaders 编译)模块过程

1. 在上一步中，会调用`webpack/lib/compilation.js` 中的 `_handleModuleBuildAndDependencies` 方法启动编译模块的过程

   ```js
   _handleModuleBuildAndDependencies(originModule, module, recursive, callback) {
   	...
   	// 通过 buildModule 启动构建模块
   	this.buildModule(module, err => {
   	});
   }
   
   // 计划模块对象的生成
   buildModule(module /* 将要建造的模块 */, callback) {
   	// 通过一种执行机制，最终会调用下面的 _buildModule 来构建模块
   	this.buildQueue.add(module, callback);
   }
   ```

   最终执行 `_buildModule` 启动编译过程：

   ```js
   // Builds the module object 构建模块对象
   _buildModule(module /* 将要建造的模块 */, callback) {
   	...
   	// 调用模块实例的 needBuild 方法 - 这个方法似乎是用来检测模块是否可以重用，此时不需要构建
   	module.needBuild(
   		{...}, // 参数
   		(err, needBuild) => {
   			// 出现错误
   			if (err) return callback(err);
   			// 模块可以重用，此时不需要构建
   			if (!needBuild) { ... }
   			// 在模块构建开始之前触发，可以用来修改模块 - 传入模块实例
   			// 如果需要生成 source-map 的话，会注入一个插件 -- module.useSourceMap = true; 给模块实例打上一
   			this.hooks.buildModule.call(module);  
   			this.builtModules.add(module); // 将该模块添加至 builtModules 集合中 - 包含了该构建流程中所有模
   			// 通过模块实例的 build 启动构建
   			module.build(
   				this.options, // webpack 配置项
   				this, // compilation 实例
   				this.resolverFactory.get("normal", module.resolveOptions),
   				this.inputFileSystem, // 文件操作方法
   				err => {
   				}
   			);
   		}
   	);
   }
   ```
   
2. 调用 `module.build`，实际上流程转到了 `webpack/lib/NormalModule.js` 的 `build` 方法，在这个方法中，执行 `loaders` 的 `pitch` 阶段、`normal` 阶段，最终得到一个结果[(包含编译后的资源、sourcemap?、meta?)](https://webpack.docschina.org/api/loaders/#thiscallback)，在根据这个编译结果，生成一个对象赋值到 `NormalModule(模块实例)._source` 中。

   大致流程如下，[具体可参考](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/NormalModule.js)：

   ```js
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
   	 * 2. _doBuild 方法处理好了构建的模块，将其存储在模块实例的 _source 中，执行 _doBuild 方法的回调，在这里通过 ast 分析模块依赖关系，生成 buildHash 模块 hash(存储在 this.buildInfo.hash: 'fb3946de651534a6717ed3745bd94032')
   	 * 		最后调用 callback 回到 ./Compilation.js 的 module.build 的回调中
    	 */
   ```

### 4. 递归构建模块的依赖

1. 在编译完成模块后，最后回到启动编译的方法 `_handleModuleBuildAndDependencies` 中，会调用 `processModuleDependencies` 方法递归解析依赖：

   ```js
   // 处理模块构建 和 处理模块依赖项的递归构建
   _handleModuleBuildAndDependencies(originModule, module, recursive, callback) {
   	// ...
   	// 启动构建模块
   	this.buildModule(module, err => {
   		//...
   	
   		// 递归解析模块的依赖
   		this.processModuleDependencies(module, err => {
   			if (err) {
   				return callback(err);
   			}
   			callback(null, module);
   		});
   ```

2. 在 `processModuleDependencies` 方法中，通过内部执行机制，最终调用 `_processModuleDependencies` 进行依赖解析，解析出依赖列表后，遍历调用 `handleModuleCreation` 方法，重复上述步骤：创建模块实例、loaders 编译模块、解析模块依赖、递归构建模块依赖

   ```js
   // processModuleDependencies -- 最终调用 _processModuleDependencies 方法
   processModuleDependencies(module, callback) {
   	this.processDependenciesQueue.add(module, callback);
   }
   
   // _processModuleDependencies
   _processModuleDependencies(module, callback) {
   	// ...
   	/**
   	 * 最终会分析模块的依赖项集合：
   	 * {
   	 *   factory: NormalModuleFactory,
   	 *   dependencies: [HarmonyImportSideEffectDependency, HarmonyImportSpecifierDependency],
   	 * 	 originModule: module
   	 * }
   	 */
   	const sortedDependencies = []; // 收集到的这个模块依赖
     // 其他步骤都省略一下，最终会执行这个方法，遍历依赖，执行 handleModuleCreation 方法，重复上述步骤：创建模块实例、loaders 编译模块、解析模块依赖、递归构建模块依赖
     const onDependenciesSorted = err => {
   		this.processDependenciesQueue.increaseParallelism();
   		// 遍历模块的依赖项
   		for (const item of sortedDependencies) {
   			inProgressTransitive++;
   			// 递归调用 handleModuleCreation 方法，启动构建这个模块：创建模块实例、缓存模块、loaders 编译模块、递归构建模
         this.handleModuleCreation(item, err => {
   
         });
   	}
   };
   }
   ```

### 5. 总结

上述步骤都比较省略，可以查看[源代码注释](https://github.com/tianya071128/wenshuli/tree/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib)查看全流程，最终会将构建的全部模块都存放在 `Compilation._modules` 中，查看下图。

![image-20220217104710309](/img/75.png)

## 参考

* [webpack 4 源码主流程分析（一）：前言及总流程概览](https://juejin.cn/post/6844904047221145613#heading-2)
* [多图详解，一次性搞懂Webpack Loader](https://juejin.cn/post/6992754161221632030#heading-9)
