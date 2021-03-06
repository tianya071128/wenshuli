---
title: cache
date: 2021-10-21 15:00:00
permalink: /webpack/cache
categories: -- 工程化
  -- webpack
tags:
  - null
---

# cache

何为缓存？在前端而言，就是利用空间换时间，而在这个空间，就是存放数据的地方，将需要缓存的数据存在本地，重复利用

对于 `webpack`，缓存的类型分为：`memory` 和 `filesystem`，缓存的数据类型比较多，大致有 `Resolver(用于获得各 loader 和模块的绝对路径等信息。)` `module(生成的模块实例)`、`codeGeneration`、`Compilation/assets`等资源

## cache.type：缓存类型

`string: 'memory' | 'filesystem'`

将 `cache` 类型设置为内存或者文件系统

- `memory`：内存系统，内部闭包引用一个 `Map` 结构管理缓存，`webpack` 退出后就会被清除
- `filesystem`：文件系统，`webpack5`新增，创建文件进行缓存，更持久化

## cache 内部工作流

- webpack 读取缓存文件。

  - 没有缓存文件 -> 没有构建缓存
  - 缓存文件中的 `version` 与 `cache.version` 不匹配 -> 没有构建缓存

- webpack 将解析快照（

  ```
  resolve snapshot
  ```

  ）与文件系统进行对比

  - 匹配到 -> 继续后续流程

  - 没有匹配到：

    - 再次解析所有解析结果（

      ```
      resolve results
      ```

      ）

      - 没有匹配到 -> 没有构建缓存
      - 匹配到 -> 继续后续流程

- webpack 将构建依赖快照（

  ```
  build dependencies snapshot
  ```

  ）与文件系统进行对比

  - 没有匹配到 -> 没有构建缓存
  - 匹配到 -> 继续后续流程

- 对缓存 entry 进行反序列化（在构建过程中对较大的缓存 entry 进行延迟反序列化）

- 构建运行（有缓存或没有缓存）

  - 追踪构建依赖关系
    - 追踪 `cache.buildDependencies`
    - 追踪已使用的 loader

- 新的构建依赖关系已解析完成

  - 解析依赖关系已追踪
  - 解析结果已追踪

- 创建来自所有新解析依赖项的快照

- 创建来自所有新构建依赖项的快照

- 持久化缓存文件序列化到磁盘

## 内部源码

1. 根据 `webpack.options.cache`注册相应的插件，[跳转查看](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/WebpackOptionsApply.js)

2. 在插件内部会注册对应的 `compiler.cache.hooks`, [缓存相关插件](https://github.com/tianya071128/wenshuli/tree/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack@5.68.0/lib/cache)

   > compiler.cache：是一个 Compiler 编译器对应的 cache 类，Compiler 构建的内容都会经过这个 cache 类来获取到缓存，缓存插件就是通过注册 `cache.hooks` 来进行缓存

## 参考

可参考这一篇文章：[掘金-浅谈 webpack 缓存优化策略](https://juejin.cn/post/7033220393888383007#heading-0)
