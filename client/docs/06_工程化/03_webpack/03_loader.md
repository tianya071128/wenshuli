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

## 浅析 webpack 调用 loader 流程？

在 `node_modules\webpack\lib\NormalModule.js` 文件中的 `_doBuild` 方法中启动 `loader` 的调用

1. 调用 `_createLoaderContext` 方法创建 `loaderContent`，为所有的 `loader` 提供[上下文环境](https://webpack.docschina.org/api/loaders/#example-for-the-loader-context)并共享：

   ```js
   const loaderContext = this._createLoaderContext(
   	resolver,
   	options,
   	compilation,
   	fs,
   	hooks
   );
   ```

   
