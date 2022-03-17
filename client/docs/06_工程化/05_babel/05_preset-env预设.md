---
title: 官方预设：@babel/preset-env
date: 2021-10-21 15:00:00
permalink: /babel/presetsEnv
categories: -- 工程化
  -- babel
tags:
  - null
---

# 官方预设：@babel/preset-env

`@babel/preset-env`是一个**智能预设**，它能根据目标环境来管理需要哪些插件进行语法转换(以及浏览器 polyfill)，允许使用最新的 JS，可以 JS 包更小。

## 工作原理

`@babel/preset-env` 根据一些开源库，比如[`browserslist(管理环境列表)`](https://github.com/browserslist/browserslist)、[`compat-table(ECMAScript 兼容性表)`](https://github.com/kangax/compat-table)和[`electron-to-chromium(Electron到Chromium版本映射)`](https://github.com/Kilian/electron-to-chromium).

我们利用这些数据源来维护我们支持的目标环境[的哪个版本](https://github.com/babel/babel/blob/main/packages/babel-compat-data/data/plugins.json)获得了对 JavaScript 语法或浏览器功能的支持的映射，以及这些语法和功能到 Babel 转换插件和 core-js polyfills 的映射。

**`@babel/preset-env` 会获取指定的 `targets` 的目标环境并根据语法映射得到需要的插件列表传递给 babel**

::: warning 注意

`@babel/preset-env`不会包含任何低于第 3 阶段的 JavaScript 语法提案，因为在 TC39 流程的那个阶段，无论如何它都不会被任何浏览器实现。这些将需要手动包含在内。该`shippedProposals`选项将包括一些浏览器已经实施的第 3 阶段提案。

:::

## 使用 Browserslist

对于基于浏览器或 Electron 的项目，建议使用[`.browserslistrc`](https://github.com/browserslist/browserslist)文件来指定目标环境。这个文件也被生态系统中许多工具所使用

默认情况下`@babel/preset-env`将使用 [browserslist 配置源](https://github.com/ai/browserslist#queries) ，除非设置了[targets](https://babel.docschina.org/docs/en/babel-preset-env/#targets)或[ignoreBrowserslistConfig](https://babel.docschina.org/docs/en/babel-preset-env/#ignorebrowserslistconfig)选项。也就是说，[targets](https://babel.docschina.org/docs/en/babel-preset-env/#targets) 和 Browserslist 不会合并处理

## 选项

### targets：目标环境

`string | Array<string> | { [string]: string }`

1. 使用 `@babel/preset-env` 设置的 `targets` 选项，没有设置的话：
2. 使用 [`options.targets`](/babel/configOptions/#targets-支持环境) 顶级选项，没有设置的话：
3. 使用 [browserslist 配置源](https://github.com/ai/browserslist#queries) ，没有指定的话：
4. 使用默认值：假设你的目标是最旧的浏览器

有关用法，查阅[`options.targets`](/babel/configOptions/#targets-支持环境)

### modules：模块转换类型

`"amd" | "umd" | "systemjs" | "commonjs" | "cjs" | "auto" | false`, 默认为`"auto"`.

配置将 ES 模块语法转换为哪种模块类型。其中 `cjs` 只是 `commonjs` 的别名

**`@babel/preset-env` 会根据其配置决定使用哪种[模块格式的插件](https://babel.docschina.org/docs/en/plugins-list/#%E6%A8%A1%E5%9D%97%E6%A0%BC%E5%BC%8F)**

* `false`：将保留 ES 模块，import/export 导出语句不转译

  ```js
  // 输入
  export default 42;
  
  // 输出
  export default 42;
  ```

* `amd`：将 ES 模块语句转换为[AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)。内部启用 [@babel/plugin-transform-modules-amd](https://babel.docschina.org/docs/en/babel-plugin-transform-modules-amd/) 插件进行转换

  ```js
  // 输入
  export default 42;
  
  // 输出
  define(["exports"], function(exports) {
    "use strict";
  
    Object.defineProperty(exports, "__esModule", {
      value: true,
    });
  
    exports.default = 42;
  });
  ```

* `auto`：默认情况下使用[`caller`](https://babel.docschina.org/docs/en/options#caller)数据来确定转换应该转换 ES 模块和模块特性。通常`caller`数据由 `babel`集成中指定(例如`babel-loader`, `@rollup/plugin-babel`)，不建议用户用户自己传递 `caller` 数据

  > 在 babel-loader 中，会构建一个 caller 对象传递给 `babel` 程序
  >
  > ```js
  > caller {
  >   name: "babel-loader",
  >   target: "web",
  >   supportsStaticESM: true,
  >   supportsDynamicImport: true,
  >   supportsTopLevelAwait: true,
  > }
  > ```
  >
  > 这样 `@babel/preset-env` 就不会转译 ES 模块了，因为转译 ES 模块语法需要交由 `webapck` 处理

### useBuiltIns：处理 polyfill

`"usage"`| `"entry"`| `false`, 默认为`false`.

此选项配置如何处理 `polyfill`；

::: warning 注意

1. `babel` 在 `7.4.0 ` 中已经弃用 `@babel/polyfill`，目前使用开源库 [core-js](https://github.com/zloirock/core-js) 和 [regenerator-runtime(生成器和 async/await 语法)](https://www.npmjs.com/package/regenerator-runtime) 进行 `polyfill`
2. 如果指定 `usage` 或 `entry`，则最好指定 `core-js` 版本，`babel`会根据 `core-js` 版本来注入最新的 `polyfill`

:::

* `useBuiltIns: false`

  不会自动添加 `polyfill`，也不会转换 `import "core-js"` 或 `import "@babel/polyfill"`添加 `polyfill`

  此时需要自行添加 `polyfill`

* `useBuiltIns: 'usage'`：**最佳方式**

  在每个文件中根据目标环境推断出使用需要 `polyfill` 语法时自动添加特定的导入，而无需做其他工作，可以有效的减少冗余代码

  ```js
  // 输入
  var a = new Promise();
  
  // 输出
  import "core-js/modules/es.promise"; // 只会输出 promise 的 polyfill
  var a = new Promise();
  ```

* `useBuiltIns: 'entry'`

  会启用新插件，将 `import "core-js"` 和 `import "regenerator-runtime/runtime"` 转换成目标环境下需要的 `polyfill`。

  一般而言在入口文件中统一 `import "core-js/xxx" ` 来导入所需的 `polyfill` 类别，会增大入口文件大小

  ```js
  // 输入
  import "core-js"; // polyfill 所有 `core-js` 特性，包括早期提案：
  import "core-js/stable" // polyfill 仅稳定的特性 - ES 和 web 标准：
  
  // 输出 - 根据目标环境不同而不同
  import "core-js/modules/es.string.pad-start";
  import "core-js/modules/es.string.pad-end";
  ... 
  ```

  或者只需要一些特定的 `polyfill`，阅读[core-js](https://github.com/zloirock/core-js)的文档以获取有关不同入口点。例如：填充数组方法和新 `Match` 提案

  ```js
  // 输入
  import "core-js/es/array";
  import "core-js/proposals/math-extensions";
  
  // 输出
  import "core-js/modules/es.array.unscopables.flat";
  import "core-js/modules/es.array.unscopables.flat-map";
  import "core-js/modules/esnext.math.clamp";
  import "core-js/modules/esnext.math.deg-per-rad";
  import "core-js/modules/esnext.math.degrees";
  import "core-js/modules/esnext.math.fscale";
  import "core-js/modules/esnext.math.rad-per-deg";
  import "core-js/modules/esnext.math.radians";
  import "core-js/modules/esnext.math.scale";
  ```

  如果 `corejs` 版本设置为 `2` 的话，可以 `import '@babel/polyfill';`，但实际上还是会导入 `core-js` 的 `polyfill` 内容

  ```js
  "corejs": "2"
  
  // 输入
  import '@babel/polyfill';
  
  // 输出
  require("core-js/modules/es6.array.copy-within.js");
  require("core-js/modules/es6.array.fill.js");
  require("core-js/modules/es6.array.filter.js");
  require("core-js/modules/es6.array.find.js");
  ```

### corejs：指定 core-js 版本

类型：`string` | `{ version: string, proposals: boolean }`，默认为 `"2.0"`

版本：`v7.4.0`

在 `v7.4.0` 版本中，`babel` 废弃了 `@babel/polyfill`，而改用 [core-js](https://github.com/zloirock/core-js)来支持 `ployfill`

此选项仅在 `useBuiltIns: usage` 或 `useBuiltIns: entry` 时一起使用，用来确保 `@babel/preset-env` 预设注入与 `core-js` 版本支持的(最新的) `polyfill`。建议指定次要版本，否则`"3"`将被解释为`"3.0"`可能不包含最新功能的 polyfill。

::: warning 使用提案 polyfill

默认情况下，只会注入稳定的 ECMAScript 特性的 `polyfill`，如果想要使用提案语法的话：

* 使用 `useBuiltIns: entry` 时，直接导入一个[proposal polyfill](https://github.com/zloirock/core-js/tree/master/packages/core-js/proposals)：`import "core-js/proposals/string-replace-all"`
* 使用 `useBuiltIns: usage` 时，有两种不同选择：
  * 设置 [`shippedProposals`](https://babel.docschina.org/docs/en/babel-preset-env/#shippedproposals) 选项设置为`true`，这将为已经在浏览器中提供一段时间的提案启用 polyfill 和转换。
  * 使用`corejs: { version: "3.8", proposals: true }`：这将 `polyfill` 提案语法

:::

### shippedProposals：启用提案语法

`boolean`, 默认为`false`

启用对已在浏览器中提供的内置/功能建议的支持，这些提案都是已经在浏览器已经实现的语法，都在 `Stage-3` 阶段以上

这些提案语法与 `@babel/preset-stage-3` 不完全一致，不完全支持 `Stage-3` 语法，因为提案可以在浏览器实现之前继续更改。

### 其他选项

* `debug`：`console.log` 输出根据目标环境启用的 `polyfill` 和转换插件以及其他选项
* `include`：始终包含的插件数组。
* `exclude`：始终排除/删除的插件数组。
* [其他选项](https://babel.docschina.org/docs/en/babel-preset-env/)

## 

