---
title: module
date: 2021-10-21 15:00:00
permalink: /webpack/module
categories: -- 工程化
  -- webpack
tags:
  - null
---

# 模块

在 `webpack` 中，**模块可以简单对应着一个文件**。精心编写的 **模块** 提供了可靠的抽象和封装界限，使得应用程序中每个模块都具备了条理清晰的设计和明确的目的。

`webpack` 从入口文件开始解析，递归解析入口开始所有的模块依赖，在内部构建出[模块依赖图](https://webpack.docschina.org/concepts/dependency-graph/)，包含着应用程序中所有的模块，然后根据配置项生成对应的 `chunk`

## 模块的构建

在 `webpack` 中，应用的最小单位就是一个模块，默认支持 `js` 和 `json` 模块，其他模块都需要 `loader` 扩展支持。

模块的构建简单讲经过下述流程，[具体流程查看](/webpack/loader/#浅析-webpack-调用-loader-构建模块流程)

- 模块实例的构建：
  - resolve：解析模块的路径，加载出处理资源的 `loader` 数组、 `parser对象(用于 AST 生成)` 、 `generator对象(用于模板生成)`以及其他信息
  - 创建模块实例
- 使用 `loader` 数组对资源进行编译，得到编译结果
- 对编译结果进行 `parser`，得到 `AST`，分析 `AST` 可以得到模块的依赖项
- 递归构建模块的依赖项，重复上述流程

e.g：

1. 对于 `JavaScript` 文件而言，经过上述流程会编译为：

   ::: details 点击查看

   ```js
   /** webpack loader 配置 */
   {
     test: /\.m?js$/,
     exclude: /(node_modules|bower_components)/,
     use: {
       loader: 'babel-loader',
       options: {
         presets: [
           [
             '@babel/preset-env',
             {
               corejs: '3',
               useBuiltIns: 'usage',
             },
           ],
         ],
         plugins: ['@babel/plugin-proposal-object-rest-spread'],
       },
     },
   },

   /** 输入 */
   import MyImage from './img/01.png';
   class Test {}
   console.log('全流程构建', MyImage, Test, Array.prototype.fill);
   /**_ 输出，经过 loader 进行编译后 */
   import _createClass from '@babel/runtime/helpers/createClass';
   import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
   import 'core-js/modules/es.array.fill.js';
   import MyImage from './img/01.png';

   var Test = _createClass(function Test() {
   	_classCallCheck(this, Test);
   });

   console.log('全流程构建', MyImage, Test, Array.prototype.fill);
   ```

2. 对于 `png` 文件而言，编译结果：

   ::: details 点击查看

   ```js
   /** webpack loader 配置 */
   {
     test: /\.(png|jpg|gif)$/i,
     use: [
       {
         loader: 'url-loader',
         options: {
           limit: 1 * 1024,
         },
       },
     ],
   },

   /** 输入 */
   // Buffer：二进制图片内容

   /** 输出 - 这个 png 会被单独编译成图片文件，此时对于引入这个图片的模块来说，得到的就是一个 url 路径 */
   module.exports = __webpack_public_path__ + "48bd36ea4fc5ea87bfe5bc4fa3bf05b2.png";
   ```

   :::

::: warning 注意

上述编译是在模块层面进行编译的，`Compiler` 编译器先将所有的模块进行编译完成，并保存在 `Compiler.modules` 中，以及保存这些模块之间的引用关系。

然后会根据 `options.targets` 和 `options.output` 等配置项继续编译模块并组织模块生成 `chunk`

:::

## 解析(resolve)

`options.resolve` 这些选项设置模块如何被解析，而 `options.resolveLoader` 用于解析 webpack 的 loader 包，配置项与 `options.resolve`一样

[详细配置项见官网](https://webpack.docschina.org/configuration/resolve/)

### resolve.alias：别名

创建 `import` 或 `require` 的别名，来确保模块引入变得更简单。

```js
/** webpack 配置 */
const path = require('path');

module.exports = {
  //...
  resolve: {
    alias: {
      @: path.resolve(__dirname, 'src'),
    },
  },
};

/** 请求路径 */
import Utility from '@/utilities/utility'; // 会被解析为 src/utilities/utility
```

::: warning vscode 识别别名的路径导入

设置了 webpack alias 时，vscode 默认无法识别别名路径，此时需要在项目根目录下创建 `jsconfig.json` (ts 项目为 `tsconfig.json`)：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

:::

### resolve.extensions：文件后缀名

`[string] = ['.js', '.json', '.wasm']`

配置路径可以省略的文件后缀名，会尝试按顺序解析这些后缀名。如果有多个文件有相同的名字，但后缀名不同，webpack 会解析列在数组首位的后缀的文件 并跳过其余的后缀。

```js
/** webpack 配置项 */
module.exports = {
  //...
  resolve: {
    extensions: ['.js', '.json', '.wasm'],
  },
};

/** 请求路径 */
import File from '../path/to/file'; // 此时会解析为 file(.js | .json | .wasm)
```

### resolve.mainFields：导入 npm 模块时，使用 package.json 字段

`[string]` 优先级从左到右

当从 npm 包中导入模块时（例如，`import * as D3 from 'd3'`），此选项将决定在 `package.json` 中使用哪个字段导入模块。

根据 `options.target` 配置项不同，默认值也不同：

- 当 `target` 属性设置为 `webworker`, `web` 或者没有指定：`['browser', 'module', 'main']`
- 其他任意的 target（包括 `node`）：`['module', 'main']`

```js
/** 假设 upstream 库 package.json */
{
  "browser": "build/upstream.js",
  "module": "index"
}

/**
 * 导入语句
 * 	在 web 环境下，取 browser 值
 *  在 node 环境下，取 module 值
 */
import * as Upstream from 'upstream';
```

### resolve.mainFiles：默认解析文件名

`[string] = ['index']`

当导入一个目录形式时，尝试去解析目录下的文件名

```js
/** webpack 配置 */
module.exports = {
  //...
  resolve: {
    mainFiles: ['index', 'index02'],
  },
};

/**
 * 导入目录
 *  会先尝试解析文件 ./test/index 是否存在，不存在尝试解析文件 ./test/index02 是否存在
 */
import './test';
```

## 模块(module)

这些选项决定了如何处理项目中的不同类型的模块，还是查看[官方文档](https://webpack.docschina.org/configuration/module)
