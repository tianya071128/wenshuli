---
title: output
date: 2021-10-21 15:00:00
permalink: /webpack/output
categories: -- 工程化
  -- webpack
tags:
  - null
---

# output

`output` 指示 webpack 如何去输出、以及在哪里输出你的「bundle、asset 和其他你所打包或使用 webpack 载入的任何内容」。

**即使可以存在多个 `entry` 起点，但只能指定一个 `output` 配置。**

## 目录相关配置

### path：输出目录

`string = path.join(process.cwd(), 'dist')`

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

### publicPath：「此输出目录对应的**公开 URL**」

`function` `string`

此选项指定在浏览器中所引用的「此输出目录对应的**公开 URL**」。

**指定资源文件引用的目录 ，打包后浏览器访问服务时的 url 路径中通用的一部分。**

```js
/* 配置项 */
module.exports = {
  //...
  output: {
    publicPath: '/assets/',
    chunkFilename: '[id].chunk.js',
  },
};

/* 对于一个 chunk 请求 */
// 看起来像这样 /assets/4.chunk.js。

/* 对于输出的 HTML，看起来像这样 */
<link href="/assets/spinner.gif" />

/* CSS 中的图片 */
background-image: url(/assets/spinner.gif);
```

注意：

- 示例配置：

  ```js
  module.exports = {
    //...
    output: {
      // One of the below
      publicPath: 'auto', // It automatically determines the public path from either `import.meta.url`, `document.currentScript`, `<script />` or `self.location`.
      publicPath: 'https://cdn.example.com/assets/', // CDN（总是 HTTPS 协议）
      publicPath: '//cdn.example.com/assets/', // CDN（协议相同）
      publicPath: '/assets/', // 相对于服务(server-relative)
      publicPath: 'assets/', // 相对于 HTML 页面
      publicPath: '../assets/', // 相对于 HTML 页面
      publicPath: '', // 相对于 HTML 页面（目录相同）
    },
  };
  ```

- 在编写 loader、plugin 时，在编译时(compile time)无法知道输出文件的 `publicPath` 的情况下，可以留空，然后在入口文件(entry file)处使用[自由变量(free variable)](https://stackoverflow.com/questions/12934929/what-are-free-variables) `__webpack_public_path__`，以便在运行时(runtime)进行动态设置。

## 文件名配置

### filename：同步文件名

`string` `function (pathData, assetInfo) => string`

此选项决定了每个输出 bundle 的名称。会将其写入到 `output.path` 选项指定的目录下。

注意：

1. 当通过多个入口起点(entry point)、代码拆分(code splitting)或各种插件(plugin)创建多个 bundle，应该使用模板化文件名，来赋予每个 bundle 一个唯一的名称

   ```js
   module.exports = {
     filename: '[name].[contenthash].js',
   };
   ```

2. 可以使用像 `'js/[name].[contenthash].js'` 这样的文件夹结构。这样就是输出到一个文件夹 `js` 中

3. **注意：**它只影响最初加载的输出文件

   - 对于「按需加载 chunk」的输出文件，请使用 [`output.chunkFilename`](https://webpack.docschina.org/configuration/output/#outputchunkfilename) 选项来控制输出。

     但是默认会使用 `output.filename` 配置

   - 对于 loader 创建的文件也不受影响，必须尝试 loader 特定的可用选项。

   - 对于一些 plugin 生成的文件，则需要具体根据 plugin 选项

### chunkFilename：异步文件名

`string = '[id].js'` `function (pathData, assetInfo) => string`

此选项决定了非初始（non-initial）chunk 文件的名称。默认值为 `[id].js`或从 `output.filename` 推断出来(有条件推断)

注意：

1. 使用 `[id]` 时，在 `development` 环境下是目录和文件名拼接的 `src_chunk_chunk01_js`，而在 `production` 模式下，则是以数字来分配。
2. 与 `filename` 类似，也可以使用像 `'chunkjs/[name].[contenthash].js'` 这样的文件夹结构

### sourceMapFilename：生成 map 文件名

`string = '[file].map[query]'`

此选项是配置生成 map 文件时的文件名，会向硬盘写入一个输出文件。

注意：

- 仅在 `devtool` 设置生成 `map` 文件时有效
- 可以使用 [#output-filename](https://webpack.docschina.org/configuration/output/#output-filename) 中的 `[name]`, `[id]`, `[hash]` 和 `[chunkhash]` 替换符号。除此之外，还可以使用 [Template strings](https://webpack.docschina.org/configuration/output/#template-strings) 在 Filename-level 下替换。

### assetModuleFilename：资源文件名

`string = '[hash][ext][query]'`

与 [`output.filename`](https://webpack.docschina.org/configuration/output/#outputfilename) 相同，不过应用于 [Asset Modules](https://webpack.docschina.org/guides/asset-modules/)。

注意：资源模块(Asset Modules) 是 webpack5 新增的，它允许使用资源文件（字体，图标等）而无需配置额外 loader。

## 异步 chunk 相关配置

### chunkLoadTimeout：chunk 请求到期之前的毫秒数，默认为 120000。

```js
/* 加载 chunk 时默认使用的是 jsonp */
script = document.createElement('script');
script.timeout = 120; // 兼容性不高，后面还会使用 setTimeout 兼容
script.src = url;

// 同时使用定时器兼容
var timeout = setTimeout(
  onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }),
  120000
);
```

### chunkLoadingGlobal：用于加载 chunk 的全局变量。

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

### chunkLoading：加载 chunk 的方法

（默认值有 'jsonp' (web)，'importScripts' (WebWorker)，'require' (sync node.js)，'async-node' (async node.js)，还有其他值可由插件添加)。

```js
/* jsonp 方式大致如下 */
__webpack_require__.l = (url, done, key, chunkId) => {
  if (inProgress[url]) {
    inProgress[url].push(done);
    return;
  }
  var script, needAttach;
  if (key !== undefined) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      if (
        s.getAttribute('src') == url ||
        s.getAttribute('data-webpack') == dataWebpackPrefix + key
      ) {
        script = s;
        break;
      }
    }
  }
  if (!script) {
    needAttach = true;
    script = document.createElement('script');
    /******/

    script.charset = 'utf-8';
    script.timeout = 60;
    if (__webpack_require__.nc) {
      script.setAttribute('nonce', __webpack_require__.nc);
    }
    script.setAttribute('data-webpack', dataWebpackPrefix + key);
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
    doneFns && doneFns.forEach((fn) => fn(event));
    if (prev) return prev(event);
  };
  var timeout = setTimeout(
    onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }),
    60000
  );
  script.onerror = onScriptComplete.bind(null, script.onerror);
  script.onload = onScriptComplete.bind(null, script.onload);
  needAttach && document.head.appendChild(script);
};
```

## sourcemap 相关配置

下面是一些 sourcemap 相关配置

### devtoolModuleFilenameTemplate：source map 的 `sources` 数组中使用的名称

`string = 'webpack://[namespace]/[resource-path]?[loaders]'` `function (info) => string`

自定义每个 source map 的 [sources](/webpack/sourceMap/#map-%E6%96%87%E4%BB%B6%E5%90%84%E5%AD%97%E6%AE%B5%E5%90%AB%E4%B9%89) 数组中使用的名称，用于标识这个 sourcemap 转化对应的模块

![image-20220301095140787](/img/76.png)

### devtoolNamespace：source map 的 [namespace]

`string`

此选项确定 [`output.devtoolModuleFilenameTemplate`](https://webpack.docschina.org/configuration/output/#outputdevtoolmodulefilenametemplate) 使用的模块名称空间。

## 创建库(library)相关配置

以下几个配置项都是与输出库(library)相关的配置，详见：[创建 library](/webpack/library)

### library：输出一个库，为你的入口做导出。

### libraryTarget：配置如何暴露 library。

未来将不再支持，请使用 [`output.library.type`](https://webpack.docschina.org/configuration/output/#outputlibrarytype) 代理

### globalObject：决定使用哪个全局对象来挂载 library

### auxiliaryComment：允许用户向导出容器(export wrapper)中插入注释。

## 主要配置项

### clean：构建前清理输出目录

**5.20.0+**。此选项配置构建前对输出目录的操作，用于替代以前 `clean-webpack-plugin` 插件的工作

### environment：生成的运行时代码中可以使用哪个版本的 ES 特性。

此选项配置生成的代码中使用哪个版本的 ES 特性。

例如，`webpack5` 中默认使用箭头函数包裹模块代码，可以配置 `environment.arrowFunction` 不使用箭头函数

![image-20220301112235063](/img/77.png)

```js
module.exports = {
  output: {
    environment: {
      // 环境支持箭头函数 ('() => { ... }').
      arrowFunction: true,
      // 环境支持BigInt作为literal（123n）。
      bigIntLiteral: false,
      // 环境支持const和let for变量声明。
      const: true,
      // 该环境支持解构（“{a，b}=obj”）。
      destructuring: true,
      // 环境支持async import（）函数来导入EcmaScript模块。
      dynamicImport: false,
      // 该环境支持“for of”迭代（“for（const x of array）{…}”）。
      forOf: true,
      // 环境支持ECMAScript模块语法来导入ECMAScript模块（从“…”导入…）。
      module: false,
      // 该环境支持可选的链接 ('obj?.a' or 'obj?.()').
      optionalChaining: true,
      // The environment supports template literals. 环境支持模板文本。
      templateLiteral: true,
    },
  },
};
```

## 次要配置项

### asyncChunks：创建按需加载的异步 chunk

`boolean = true`，用于创建按需加载的异步 chunk。**当为 false 时，禁用按需加载的块，并将所有内容放在主块中**

### charset：为 HTML 的 `<script>` 标签添加 `charset="utf-8"` 标识。

`boolean = true`，为 HTML 的 `<script>` 标签添加 `charset="utf-8"` 标识。

::: tip 提示

尽管 `<script>` [已弃用](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#Deprecated_attributes)了 `charset` 属性，当 webpack 还是默认添加了它，目的是与非现代浏览器兼容。

:::

```js
/* 生成文件中请求 chunk 时，使用 jsonp 方式，添加 charset 属性 */
script = document.createElement('script');
script.charset = 'utf-8';
// ...
script.src = url;
```

### crossOriginLoading：启用 [cross-origin 属性](https://developer.mozilla.org/en/docs/Web/HTML/Element/script#attr-crossorigin) 加载 chunk

告诉 webpack 启用 [cross-origin 属性](https://developer.mozilla.org/en/docs/Web/HTML/Element/script#attr-crossorigin) 加载 chunk。**在请求 CDN chunk 时会有一定用处**

## 替换模板字符串-生成文件名

webpack 提供了一种使用称为 **substitution(可替换模板字符串)** 的方式，通过带括号字符串来模板化文件名。

**webpack 内部通过内置插件 [`TemplatedPathPlugin`](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/TemplatedPathPlugin.js) 来实现，具体见源码注释**
