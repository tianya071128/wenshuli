---
title: HTTP 跨域资源共享（CORS）
date: 2021-10-21 15:00:00
permalink: /http/cors
categories: 
  - 其他
  - HTTP
tags: 
  - null
---
# CORS
跨源资源共享 (CORS) （或通俗地译为跨域资源共享）是一种基于HTTP 头的机制，该机制通过允许服务器标示除了它自己以外的其它origin（域，协议和端口），这样浏览器可以访问加载这些资源。

::: tip 提示

HTTP 并没有跨域的概念，这是浏览器出于安全性的限制，浏览器限制脚本内发起的跨源 HTTP 请求

发生了跨域 HTTP 后，针对简单请求还是直接发送的，针对非简单请求先发送 OPTION 预检请求，服务器还是遵循 HTTP 规范响应

:::

## 什么情况下需要 CORS？

这份 [cross-origin sharing standard](https://www.w3.org/TR/cors/) 允许在下列场景中使用跨站点 HTTP 请求：

- 前文提到的由 [`XMLHttpRequest`](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest) 或 [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 发起的跨源 HTTP 请求。
- Web 字体 (CSS 中通过` @font-face `使用跨源字体资源)，[因此，网站就可以发布 TrueType 字体资源，并只允许已授权网站进行跨站调用](https://www.w3.org/TR/css-fonts-3/#font-fetching-requirements)。
- [WebGL 贴图](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL)
- 使用 `drawImage` 将 Images/video 画面绘制到 canvas（**可以用于下载跨域图片**）

## 简单请求和非简单请求

浏览器在发送跨域请求时，会将请求分为简单请求和非简单请求，策略不同。

满足以下条件的就是简单请求：

* 请求方法只能是以下三个：GET、HEAD、POST。

* HTTP 的头部字段不超出以下几种字段：
  * 被用户代理（e.g：浏览器）自动设置的首部字段（例如：Connection, User-Agent）和在 Fetch 规范中定义为 [禁用首部名称](https://fetch.spec.whatwg.org/#forbidden-header-name) 的其他首部
  * Accept
  * Accept-Language
  * Content-Language
  * Last-Event-ID
  * Content-Type：只限于三个值`application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`

* 请求中的任意`XMLHttpRequestUpload` 对象均没有注册任何事件监听器；`XMLHttpRequestUpload` 对象可以使用 [`XMLHttpRequest.upload`](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/upload) 属性访问。

* 请求中没有使用 [`ReadableStream`](https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream) 对象。

::: tip 测试

<http-test type="简单请求"/>

查看请求可以看出没有 OPTIONS 预检机制

<http-test type="非简单请求"/>

查看请求，在发送 DELETE 请求之前，是存在 OPTIONS 预检机制的

:::

## 简单请求的过程

对于简单请求，浏览器直接发送 CORS 请求。

对于请求报文中，会新增 `Origin` 字段，表示请求来源，服务器就可以根据这个来源判断是否同意这次请求。

```js
// 请求报文
GET /vuepress_test/http/cors HTTP/1.1 
Host: localhost:5000 
Connection: keep-alive 
// 标示请求源
Origin: http://localhost:8080 
Sec-Fetch-Site: same-site 
Sec-Fetch-Mode: cors 
Sec-Fetch-Dest: empty 
Referer: http://localhost:8080/
...

```

对于响应报文中，会新增以 `Access-Control-` 开头的头部字段，用于表示服务器对此次 CORS 请求的策略。主要是以下三个：

* **Access-Control-Allow-Origin**：**必须**， 表示能够接受的域名（* 表示接受所有的域名）。
* **Access-Control-Allow-Credentials**：**可选**，表示是否允许发送 cookie（需要浏览器也设置，见下文）
* **Access-Control-Expose-Headers**： **可选**，CORS请求时，XMLHttpRequest对象的getResponseHeader()方法只能拿到6个基本字段：Cache-Control、Content-Language、Content-Type、Expires、Last-Modified、Pragma。如果想拿到其他字段，就必须在Access-Control-Expose-Headers里面指定

```js
// 响应报文
HTTP/1.1 200 OK 
Access-Control-Allow-Origin: * 
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept 
Access-Control-Allow-Methods: PUT, POST, GET, DELETE, OPTIONS 
Access-Control-Allow-Credentials: true 
Date: Fri, 05 Nov 2021 09:14:26 GMT Connection: 
keep-alive Transfer-Encoding: chunked
```

## 非简单请求的过程

当浏览器识别到请求为非简单请求时，会先发送一个预检请求到服务器，以获知服务器是否允许该实际请求。

### 预检请求

使用 `OPTIONS` 请求方法进行预检请求。**"预检请求“的使用，可以避免跨域请求对服务器的用户数据产生未预期的影响。**

对于请求报文，使用 OPTIONS 方法，头部字段新增

* Origin：**必需字段**，请求源。
* Access-Control-Request-Method：**必需字段**，告知服务器请求使用方法，此例中为 PUT 请求
* Access-Control-Request-Headers：**必需字段**，告知服务器请求将携带的自定义请求首部字段

```js
// 请求报文
OPTIONS /vuepress_test/http/cors HTTP/1.1

Host: localhost:5000
Connection: keep-alive
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type,x-requested-with
Origin: http://localhost:8080
...
```

::: tip 测试

<http-test type="非简单请求"/>

这个请求使用 PUT，并且添加一个自定义字段 X-Custom-Header

:::



