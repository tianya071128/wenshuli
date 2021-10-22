---
# 页面 title, 同时也是 侧边栏 title
title: Meta 标签
date: 2021-10-21 17:00:00
# 永久链接, 不与页面目录路径
permalink: /html/meta
categories: 
  - 前端
  - HTML
tags: 
  - null
---
# Meta

meta 元素定义的元数据的类型包括以下几种:

* 如果设置了 [`http-equiv`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/meta#attr-http-equiv) 属性，`meta` 元素则是编译指令，提供的信息与类似命名的HTTP头部相同。
* 如果设置了 [`name`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/meta#attr-name) 属性，`meta` 元素提供的是文档级别（*document-level*）的元数据，应用于整个页面。
* 如果设置了 [`charset`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/meta#attr-charset) 属性，`meta` 元素是一个字符集声明，告诉文档使用哪种字符编码。
* 如果设置了 itemprop(全局属性) 属性，meta 元素提供用户定义的元数据。

## 1. charset: 设置文档字符集声明

如果使用了这个属性, 则值必须是 `utf-8`

```html
<meta charset="utf-8">
```

## 2. http-equiv: 设置 HTTP 响应头

**用于设置请求该 HTML 时, 响应头的信息, 在请求服务器获取`html`的时候，服务器会将`html`中设置的`meta`放在响应头中返回给浏览器。**

::: tip 提示
依靠 meta 来缓存是不可靠的, 随着 HTTP 的发展, 缓存的字段也更多了, 最终还是需要依赖服务端设置缓存字段来进行静态资源的缓存
:::

### content-type: 字符集的设定

用于声明文档类型、字符集。**如果使用这个属性，其值必须是"`text/html; charset=utf-8`"。**

```html
<meta http-equiv="content-type" content="text/html charset=utf8">
```

### Pragma: 缓存

禁止浏览器从本地计算机的缓存中访问页面的内容, 这样设定，访问者将无法脱机浏览。 

```html
<meta http-equiv="Pragma" content="no-cache">
```

::: warning 警告
本来想示例测试一下, 但是发现好像对于 html 之外的资源这个属性并不是生效, 如果服务端设置缓存时间, 还是会从计算机缓存中提取资源, 可能是因为只针对于 HTML 文件

如果对于 HTML 文件, 目前浏览器(测试的是谷歌浏览器)应该是强制请求服务器的

以上两点待具体验证

:::

### refresh: 刷新

设定一定时间刷新页面, 如果没有指定 url, 则刷新本页面

```html
<meta http-equiv="refresh" content="5 url=http://www.baidu.com">
```

<a href="/html/测试meta标签refresh刷新功能.html" target="_blank">测试一下</a>

### 更多, 待探索

## 3. name: 文档级别, 描述文档

用于设置文档级别的元数据, 应用于整个页面. `name` 设置属性名, `content`设置属性值

主要有以下几个用处:

* 网页相关
  * [X-UA-Compatible: 设置浏览器版本](#x-ua-compatible-设置浏览器版本)

* SEO 优化
  * [author: 标注网页的作者](#author-标注网页的作者)
  * [description: 描述网页内容](#description-描述网页内容)
  * [keywords: 网页关键字](#keywords-网页关键字)
  * [robots: 指示搜索引擎抓取哪些页面](#robots-指示搜索引擎抓取哪些页面)
* 移动设备设置
  * [viewport: 优化移动浏览器的显示](#viewport-移动浏览器的显示)
  * [apple-mobile-web-app-capable: WebApp 全屏模式](#apple-mobile-web-app-capable-webapp-全屏模式)
  * [theme-color: 主题颜色](#theme-color-主题颜色)
  * [format-detection: 邮箱和电话识别](#format-detection-邮箱和电话识别)

### X-UA-Compatible: 设置浏览器版本

```html
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" /> <!-- 推荐 -->

<meta http-equiv="X-UA-Compatible" content="IE=6" ><!-- 使用IE6 -->
<meta http-equiv="X-UA-Compatible" content="IE=7" ><!-- 使用IE7 -->
<meta http-equiv="X-UA-Compatible" content="IE=8" ><!-- 使用IE8 -->
```

### author: 标注网页的作者

```html
<meta name="author" content="aaa@mail.abc.com">
```

### description: 描述网页内容

```html
<meta name="description" content="这是我的HTML">
```

### keywords: 网页关键字

```html
<meta name="keywords" content="Hello world">
```

### robots: 指示搜索引擎抓取哪些页面

可取值:

* all: 文件将被检索，且页面上的链接可以被查询；
* none: 文件将不被检索，且页面上的链接不可以被查询；
* index：文件将被检索；
*  follow：页面上的链接可以被查询； 
* noindex：文件将不被检索，但页面上的链接可以被查询；
*  nofollow：文件将不被检索，页面上的链接可以被查询。

```html
<meta name="robots" content="index,follow">
```

### viewport: 移动浏览器的显示

1. width：宽度（数值 / device-width）（范围从200 到10,000，默认为980 像素）
2. height：高度（数值 / device-height）（范围从223 到10,000）
3. initial-scale：初始的缩放比例 （范围从>0 到10）
4. minimum-scale：允许用户缩放到的最小比例
5. maximum-scale：允许用户缩放到的最大比例
6. user-scalable：用户是否可以手动缩 (no,yes)

```html
<!--这是常用的移动meta设置-->
<meta name="viewport" content="width=device-width,initial-scale=1.0,minimun-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
```

### apple-mobile-web-app-capable: WebApp 全屏模式

离线 WebApp 的设置全屏模式

```html
<!-- 启用 WebApp 全屏模式 -->
<meta name="apple-mobile-web-app-capable" content="yes" /> 
```

### theme-color: 主题颜色

**设置浏览器导航栏和手机头部颜色**

![](/img/20200221134927.jpg)

```html
<meta name="theme-color" content="#11a8cd">
```

### format-detection: 邮箱和电话识别

```html
<!-- 手机号码不识别 -->
<meta content="telephone=no" name="format-detection" />
<!-- 邮箱不识别 -->
<meta content="email=no" name="format-detection" />
```

### 更多, 待探索

[参考文档](http://fex.baidu.com/blog/2014/10/html-head-tags/?qq-pf-to=pcqq.c2c)

