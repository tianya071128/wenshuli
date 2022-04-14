---
title: babel 架构
date: 2021-10-21 15:00:00
permalink: /babel/framework
categories: -- 工程化
  -- babel
tags:
  - null
---

# babel 架构

Babel 是 JavaScript 编译器，更确切地说是源码到源码的编译器，通常也叫做“转换编译器（transpiler）”。 意思是说你为 Babel 提供一些 JavaScript 代码，Babel 更改这些代码，然后返回给你新生成的代码。

## babel 的编译流程

babel 是 source to source 的转换，整体编译流程分为三步：

- parse：通过 parser 把源码转成抽象语法树（AST）

  > 这个过程分为词法分析、语法分析。

- transform：遍历 AST，调用各种 transform 插件对 AST 进行增删改

  > 会对 AST 进行遍历，处理到不同的 AST 节点会调用注册的相应的插件(插件会注册 visitor 函数)，就可以对 AST 进行增删改操作，返回新的 AST 节点(可以指定是否继续遍历新生成的 AST)

- generate：把转换后的 AST 打印成目标代码，并生成 sourcemap

  > 对处理后的 AST 进行生成，从 AST 根节点进行递归打印，就可以生成目标代码的字符串。

![img](/img/81.png)

## 参考资料

[掘金小册-Babel 插件通关秘籍](https://juejin.cn/book/6946117847848321055)

[babel 手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)
