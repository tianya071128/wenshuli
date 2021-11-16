---
# 页面 title, 同时也是 侧边栏 title
title: 高级主题
date: 2021-10-21 17:00:00
# 永久链接, 不与页面目录路径
permalink: /html/other
categories: 
  - 前端
  - HTML
tags: 
  - null
---
# 高级主题

## CORS 设置主题

在 HTML5 中，一些 HTML 元素提供了对 CORS 的支持。例如：`audio`、`img`、`link`、`script`和 `video` 均有一个跨域属性(crossorigin)，用于配置元素获取数据的 CORS 请求

这个属性是枚举的，并具有以下可能的值：

| 关键字            | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| `anonymous`       | 对此元素的 CORS 请求将不设置凭据标志。                       |
| `use-credentials` | 对此元素的CORS请求将设置凭证标志；这意味着请求将提供凭据。   |
| `""`              | 设置一个空的值，如 `crossorigin` 或 `crossorigin=""`，和设置 `anonymous` 的效果一样。 |

这些 HTML 元素默认是可以实现跨域资源请求的，并不会像 xhr 请求资源一样，需要服务端设置 CORS 跨域。

**但如果添加了 crossorigin 属性，就会通过 CORS 方式加载这些资源，此时就需要服务器进行 CORS 跨域设置**

### 对于 img 图片

使用 `crossorigin` 可以实现下载跨域图片

见另外章节：[img 图片](/html/img/#跨域图片-cookie)

### 对于 script 脚本

设置 `crossorigin` 属性可以更好获取到脚本的具体错误信息了，具体参考 [crossorigin属性](https://blog.csdn.net/qq_40028324/article/details/107076751)

::: tip 测试

<html-test type="scriptCors" />

:::
