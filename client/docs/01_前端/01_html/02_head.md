---
# 页面 title, 同时也是 侧边栏 title
title: Head 标签
date: 2021-10-21 16:00:00
# 永久链接, 不与页面目录路径
permalink: /html/head
categories: 
  - 前端
  - HTML
tags: 
  - null
---

# Head 标签
`<head>` 是不会显示在页面上的, 它的作用是保存页面的一些元数据, 一个页面通常包含很多元数据, 一下是常用的元素介绍 

## `<title>`: 标题

`<title>` 主要有两个作用:

* 页面标题和 SEO
* 当保存页面时, 默认为 标题 为标签名

打开这个 <a href="/html/测试title标签.html" target="_blank">HTML</a> 试试, 并保存标签测试一下吧

## `<base>`: 文档根 URL 元素

`<base>` 标签用于定义文档中的所有相对 URL 的根 URL. 一份中只能有一个 `<base>` 标签

**如果指定了多个 `<base>` 元素，只会使用第一个 `href `和 `target `值, 其余都会被忽略。**

属性:

* href: 用于文档中相对 URL 地址的基础 URL。允许绝对和相对URL。
* target: 用于文档链接跳转行为
  * `_self`: 载入结果到当前浏览上下文中。（该值是元素的默认值）。
  * `_blank`: 载入结果到一个新的未命名的浏览上下文。
  * `_parent`: 载入结果到父级浏览上下文（如果当前页是内联框）。如果没有父级结构，该选项的行为和`_self`一样。
  * `_top`: 载入结果到顶级浏览上下文（该浏览上下文是当前上下文的最顶级上下文）。如果没有父级，该选项的行为和_self一样。

```html
<base target="_blank" href="http://www.baidu.com/">

<!-- 会打开新标签, 跳转至 baidu.com -->
<a href="/">点击跳转</a>
```

打开这个 <a href="/html/测试base标签.html" target="_blank">HTML</a> 试试吧

## `<style>`: 文档样式

`<style>` 包含文档的样式信息或者文档的部分内容

属性:

* type: 该属性以MIME类型（不应该指定字符集）定义样式语言。如果该属性未指定，则默认为 `text/css`。
* media: **该属性规定该样式适用于哪个媒体。属性的取值CSS媒体查询，默认值为 all。** => 用于媒体查询
* nonce: 一种加密的随机数（一次使用的数字），用于在 style-src Content-Security-Policy (en-US) 中将内联样式列入白名单。
* title: 指定可选的样式表。

```html
<!-- 视图宽度小于500px 时生效 -->
<style media="all and (max-width: 500px)">
    p {
      color: blue;
      background-color: yellow;
    }
</style>
```

打开这个 <a href="/html/测试style标签.html" target="_blank">HTML</a> 试试吧

## `<link>`: 外部资源链接元素

`<link>` 规定了当前文档和外部资源的关系

通常有两个作用: 

1. 链接外部样式表, 具体可见 [css模块](/css/)

2. 创建站点图标(比如PC端的“favicon”图标和移动设备上用以显示在主屏幕的图标) 。

   ```html
   <link rel="icon" href="favicon32.png">
   ```

## `<script>`: 嵌入或引用可执行脚本

具体见 [js模块](/js/)

## `<meta>`: 文档级元数据元素

表示那些不能由其它 HTML 元相关（meta-related）元素（(`<base>`、`<link>`, `<script>`、`<style>` 或 `<title>`）之一表示的任何元数据信息。

具体见 [meta 元数据](/html/meta)
