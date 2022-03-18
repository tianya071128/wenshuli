---
title: babel 介绍
date: 2021-10-21 15:00:00
permalink: /babel/
categories: -- 工程化
  -- babel
tags:
  - null
---

# babel

## babel 是什么？

**Babel 是一个工具链，主要用于将 ECMAScript 2015+ 代码转换为当前和旧版浏览器或环境中向后兼容的 JavaScript 版本。**

## babel 的用途

- 转换语法

  > 将代码中的 `esnext` 、`typescript`、`flow`等语法转换为目标环境支持的语法

- 目标环境缺少的 `Polyfill` 功能

  > 有些语法是无法进行转换的，例如：`promise`、`Array.prototype.includes` 等语法，通过第三方 `polyfill`，填充这些语法(例如 core-js，配置 `preset-env` 预设的配置，只包含你需要的 polyfill)

- 源代码转换

  > babel 是一个转译器，暴露了很多 api，用这些可以完成 **parse(源码到 AST 转换) -> transform(AST 到 AST 转换) -> generate(AST 生成 源码)** ，可以利用特性，在 AST 层面上对源码进行转换

## babel 不能做什么？

- babel 是对 `ECMAScript` 语法的转换，对 `DOM`、`BOM` 的兼容性无法实现

- 对 `ES` 的有些语法规范无法转换(也不能 `Polyfill`)，例如： `Object.defineProperty`、`Proxy` 等一些语法规范无法处理

  > 还有一些语法的特性无法转换，例如 `promise` 的微任务特性，[class 的继承](https://es6.ruanyifeng.com/#docs/class-extends#%E5%8E%9F%E7%94%9F%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0%E7%9A%84%E7%BB%A7%E6%89%BF)等语法特性

## babel 的使用方式

由于 JavaScript 社区没有统一的构建工具、框架、平台等等，因此 Babel 正式集成了对所有主流工具的支持

### @babel/cli：babel 官方 cli

Babel 带有一个内置的 CLI，可用于从命令行编译文件。

[详细介绍](https://www.babeljs.cn/docs/babel-cli)

### @babel/register：node 环境下实时编译

通过 require 钩子（hook）。require 钩子 将自身绑定到 node 的 `require` 模块上，并在运行时进行即时编译(不会输出编译文件，而是边执行边编译)。

**但请注意这种方法并不适合正式产品环境使用。 直接部署用此方式编译的代码不是好的做法。 在部署之前预先编译会更好。 不过用在构建脚本或是其他本地运行的脚本中是非常合适的。**

[详细介绍](https://www.babeljs.cn/docs/babel-register)

### @babel/standalone：浏览器和其他非 Node.js 环境运行

@babel/standalone 提供了一个独立的 Babel 构建，**用于浏览器和其他非 Node.js 环境**。

浏览器简单用法：

```html
<!-- Load Babel -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<!-- data-presets：指定的预设 -->
<!-- 自定义脚本 - type为 text/babel，会使用 babel 进行编译 -->
<script type="text/babel"  data-presets="env,stage-3">
  const getMessage = () => "Hello World";
  document.getElementById("output").innerHTML = getMessage();
</script>
```

[详细介绍](https://www.babeljs.cn/docs/babel-standalone)

### 前端主流工具集成

Babel 正式集成了对所有主流工具的支持。

例如：[babel-loader(源码解读)]()

[其他工具集成](https://www.babeljs.cn/setup)

### @babel/core：编程的方式

这个包是 `babel` 的核心工具包，其他的方式都在集成了 `@babel/code` 包，一般情况下我们不需要直接使用。

简单使用例子：

```js
var babel = require('@babel/core');

babel
  .transformFileAsync(require('path').join(__dirname, './index.js'), {/* 配置项 */})
  .then((result) => {
  	// node 执行一下，会打印出转译后的结果
    console.log(result.code);
  });
```

注意：`@babel/core` 内部会去加载配置(按照配置规则)，也可以传递一些[特定的配置项](https://www.babeljs.cn/docs/options#primary-options)

[详细介绍](https://www.babeljs.cn/docs/babel-core)



## 参考资料

- [babel 手册](https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/user-handbook.md#making-your-own-preset)
- [babel 印记中文文档](https://babel.docschina.org/docs/en/)
- [babel 中文文档](https://www.babeljs.cn/docs/config-files)
