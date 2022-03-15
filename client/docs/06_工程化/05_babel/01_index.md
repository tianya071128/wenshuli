---
title: babel
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

* 转换语法

  > 将代码中的 `esnext` 、`typescript`、`flow`等语法转换为目标环境支持的语法

* 目标环境缺少的 `Polyfill` 功能

  > 有些语法是无法进行转换的，例如：`promise`、`Array.prototype.includes` 等语法，通过第三方 `polyfill`，填充这些语法(例如 core-js，配置 `preset-env` 预设的配置，只包含你需要的 polyfill)

* 源代码转换

  > babel 是一个转译器，暴露了很多 api，用这些可以完成 **parse(源码到 AST 转换) -> transform(AST到 AST转换) -> generate(AST 生成 源码)** ，可以利用特性，在 AST 层面上对源码进行转换

## babel 不能做什么？

* babel 是对 `ECMAScript` 语法的转换，对 `DOM`、`BOM` 的兼容性无法实现

* 对 `ES` 的有些语法无法转换(也不能 `Polyfill`)，例如： `Object.defineProperty`、`Proxy` 等无法处理

  > 还有一些语法的特性无法转换，例如 `promise` 的微任务特性，[class 的继承](https://es6.ruanyifeng.com/#docs/class-extends#%E5%8E%9F%E7%94%9F%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0%E7%9A%84%E7%BB%A7%E6%89%BF)等语法特性

## babel 的架构

