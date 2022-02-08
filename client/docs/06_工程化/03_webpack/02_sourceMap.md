---
title: source map
date: 2021-10-21 15:00:00
permalink: /sourceMap/
categories: -- 工程化
  -- sourceMap
tags:
  - null
---

# source map

现在的前端线上代码一般都是经过编译过的，主要有如下几种：

- 转译器/Transpilers (Babel, Traceur)
- 编译器/Compilers (Closure Compiler, TypeScript, CoffeeScript, Dart)
- 压缩/Minifiers (UglifyJS)

经过编译后，编译后代码已经面目全非了，不利于调试。就需要 sourcemap 技术来构建处理前的代码和处理后的代码之间的桥梁。
**用于源码的映射，可以将编译后的源码映射到原始代码，这样就便于调试**

::: warning 注意

* soucemap 虽然在 webapck 中常用，但不是 webpack 中的新概念，而是通用的，只要对源代码进行编译了(ts、babel、压缩等)，都会使用 soucemap 技术来映射源代码方便调试
* sourcemap 只有在打开 dev tools 的情况下才会开始下载，会在 `Network` 面板中隐藏 map 文件的加载

:::

## map 文件详解

```map
{
  "version": 3,
  "file": "main.source-map.js",
  "mappings": ";;;;;AAAA;AACA;AACA",
  "sources": [
    "webpack://webpack_demo/./src/index.js"
  ],
  "sourcesContent": [
    "const test = 2;\r\n\r\nconsole.log(test2);\r\n"
  ],
  "names": [],
  "sourceRoot": ""
}
```

### map 文件各字段含义

| **字段**       | **含义**                                                     |
| -------------- | ------------------------------------------------------------ |
| version        | Source map 的版本，目前为 3                                  |
| file           | 转换后的文件名                                               |
| mappings       | **记录位置信息的字符串**                                     |
| sources        | **转换前的文件,该项是一个数组,表示可能存在多个文件合并** -  所以在开发者工具的 `sources` 中会有 webpack 文件夹 |
| sourcesContent | **原始文件内容**                                             |
| names          | 转换前的所有变量名和属性名                                   |
| sourceRoot     | 转换前的文件所在的目录。如果与转换前的文件在同一目录，该项为空 |

## sourcemap 原理

在转换后的文件中的末尾会添加 `//# sourceMappingURL=main.source-map.js.map` 表示这个文件对应的 map 文件位置。

其中 map 文件的 `mappings` 记录着映射关系(转换前和转换后文件的对比)，具体原理涉及到 **VLQ编码**，暂不研究。

## webpack 中的 sourcemap 配置

**注意：**可以使用 [`SourceMapDevToolPlugin`](https://webpack.docschina.org/plugins/source-map-dev-tool-plugin) 进行更细粒度的配置。查看 [`source-map-loader`](https://webpack.docschina.org/loaders/source-map-loader) 来处理已有的 source map。

在 webpack 中，sourcemap 的配置多达二十来种，但关键的只有五种模式相互搭配：eval、source-map、cheap、module 和 inline。 --- webpack5 中新增了两种模式主要用于生产环境：hidden、nosources

| 关键字     | 含义                                                         |
| ---------- | ------------------------------------------------------------ |
| source-map | 产生.map 文件                                                |
| eval       | 使用 eval 包裹模块代码                                       |
| cheap      | 不包含列信息（关于列信息的解释下面会有详细介绍)也不包含 loader 的 sourcemap |
| module     | 包含 loader 的 sourcemap（比如 jsx to js ，babel 的 sourcemap）,否则无法定义源文件 |
| inline     | 将.map 作为 DataURI 嵌入，不单独生成.map 文件                |
| hidden     | 会生产映射信息，但是不会为 bundle 添加引用注释。如果你只想 source map 映射那些源自错误报告的错误堆栈跟踪信息，但不想为浏览器开发工具暴露你的 source map，这个选项会很有用。---  不应将 source map 文件部署到 web 服务器。而是只将其用于错误报告工具。 |
| nosources  | 创建的 source map 不包含 `sourcesContent(源代码内容)`。它可以用来映射客户端上的堆栈跟踪，而无须暴露所有的源代码。你可以将 source map 文件部署到 web 服务器。--- 这仍然会暴露反编译后的文件名和结构，但它不会暴露原始代码。 |

### *-source-map 

source-map 会单独生产 map 文件，效率比较低。通过在生成文件最后链接 map 文件地址来引用 map 文件

```js
//# sourceMappingURL=main.source-map.js.map
```

### eval-*

eval 关键字会使用 `eval()` 包裹执行，加上 eval 主要是利用**字符串可缓存**的特点，可以缓存模块的源映射，在重建时能够提效(why？)

* eval：每个模块都使用 eval() 执行，并且都有 `//# sourceURL=`。会被映射到[**生成后的代码**](https://webpack.docschina.org/configuration/devtool/#qualities)

  ```js
  eval("... var test = 2;\n\nvar testClass = /*#__PURE__*/_createClass(function testClass() {\n  _classCallCheck(this, testClass);\n});\n\nconsole.log(test2);\n\n//# sourceURL=webpack://webpack_demo/./src/index.js?");
  ```

* eval-source-map：包含 eval 关键字，所以会使用 eval() 执行。包含 source-map 关键字，所以会被映射到[原始源代码](https://webpack.docschina.org/configuration/devtool/#qualities)

::: warning 注意

* devtool: "eval" - 会映射到转换后的代码，而不是映射到原始代码，**不会处理 loader 转换关系**
* eval 与其他模式搭配默认会将 sourcemap 内联到原始文件(即默认 inline 特性)

:::

### inline-*

将 SourceMap 内联到原始文件，而不是创建单独的文件。这样可以减少文件数。

* inline-source-map：source map 转换为 DataUrl 后添加到 bundle 中。

  ```js
  //# sourceMappingURL=data: ...（base64 字符串）
  ```

* 与其他模式搭配也是类似，会将生成的 map 文件生成 base64 内联到文件中

### cheap-*

 source map 被简化为每行一个映射。错误信息只会定义到行，而不会定义到列，让 map 文件明显缩小

| inline-source-map                       | inline-cheap-source-map                 |
| --------------------------------------- | --------------------------------------- |
| 错误信息会准确到列，精准度高            | 只会定义到出错的这一行                  |
| ![image-20220207162407548](/img/72.png) | ![image-20220207162407548](/img/71.png) |

::: warning 注意

cheap 模式还会导致不能映射 loader 转换的代码，仅显示转换后的代码，如上图所示

不使用 cheap 模式的话，默认情况下会映射 loader 转换的代码(devtool: “eval" 除外)

一般 cheap 与 module 搭配，用来映射到原始源代码中 

:::

### module-*

会保留 loader 映射关系，主要用于解决 cheap 模式无法定位到 loader 处理前的源代码问题

| inline-cheap-source-map                 | inline-cheap-module-source-map          |
| --------------------------------------- | --------------------------------------- |
| 不会处理 loader 映射关系                | 处理 loader 映射关系                    |
| ![image-20220207162407548](/img/71.png) | ![image-20220207162407548](/img/73.png) |

### hidden-*

未添加对 SourceMap 的引用。当 SourceMap 未部署但仍应生成时，例如用于错误报告目的

所以不会与 inline、eval 搭配，因为需要生成单独的 map 文件

* hidden-source-map：与 `source-map` 相同，但不会为 bundle 添加引用注释。**如果你只想 source map 映射那些源自错误报告的错误堆栈跟踪信息，但不想为浏览器开发工具暴露你的 source map，这个选项会很有用。**

::: warning 注意

* hidden 模式通常用于单独生成 map 文件，可以将其上传至监控系统，这样就可以通过 map 和源文件解析出错误信息

* 或者本地收集到错误信息，通过`source-map` 和 `stacktracey` 等库进行解析，[demo](https://github.com/tianya071128/wenshuli/blob/master/client/demo/webpack/01_sourcemap/webpack_demo/src/stacktraceySourceMap.js)

:::

### nosources-*

这个模式不包含源代码内容，只是用来映射客户端上的堆栈跟踪。

* nosources-source-map：不包含源代码内容(即生成的 map 文件中没有 `sourcesContent` 字段)，只存在映射关系

  ![image-20220208094754712](/img/74.png)

::: tip 提示

相较于 hidden 模式而言，这个作为生产环境的错误追踪成本更低，精准度不足

:::

## webpack 的推荐配置

### 开发环境

开发环境下一般要求：重建快(eval)、信息全(module)，并且只需要定义到行即可(cheap)

`devtool: cheap-module-eval-source-map`

### 生产环境

生产环境肯定不要将 sourcemap 暴露出去，但是可能会使用监控平台进行监控，或者如果安全要求不严格，最好可以追踪调用堆栈

* 使用监控平台的：`hidden-source-map`
* 简单追踪调用栈的：`nosources-source-map`
* **或者针对特定用户(白名单)访问 source-map**：`source-map`
* 没有要求则不使用：`(none)`



## 参考

* [阮一峰-JavaScript Source Map 详解](http://www.ruanyifeng.com/blog/2013/01/javascript_source_map.html)
* [掘金-万字长文：关于sourcemap，这篇文章就够了](https://juejin.cn/post/6969748500938489892#heading-35)
* [webpack-devtool选项](https://webpack.docschina.org/configuration/devtool/)
