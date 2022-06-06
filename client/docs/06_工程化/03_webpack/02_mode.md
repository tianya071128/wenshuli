---
title: mode
date: 2021-10-21 15:00:00
permalink: /webpack/mode
categories: -- 工程化
  -- webpack
tags:
  - null
---

# 模式

`webpack`会根据模式的不同开启不同的内置优化

## 模式类型

`webpack` 目前支持三种模式：`development`、`production`、`none`。

| 选项          | 描述                                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development` | --> 启用 `DefinePlugin` 插件，将 `process.env.NODE_ENV` 的值设置为 `development`：影响 `optimization.nodeEnv = ‘development'` <br />--> 为模块和 chunk 启用有效的名：`optimization.chunkIds = 'named'`<br />--> 以及影响其他配置项默认值，实现不同功能                                        |
| `production`  | --> 启用 `DefinePlugin` 插件，将 `process.env.NODE_ENV` 的值设置为 `production`：：影响 `optimization.nodeEnv = 'production'`<br />--> 为模块和 chunk 启用确定性的混淆名称：`optimization.chunkIds = 'natural'`<br />--> 以及影响其他配置项默认值(主要在 `optimization 优化项`)，实现不同功能 |
| `none`        | 不使用任何默认优化选项                                                                                                                                                                                                                                                                        |

::: warning 注意

其实内部就是在不同模式去设置其他配置项的默认值，这些模式下开启的优化点都可自行配置

:::
