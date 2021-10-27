---
title: HTTP 内容协商
date: 2021-10-21 15:00:00
permalink: /http/content
categories: 
  - 其他
  - HTTP
tags: 
  - null
---

# 内容协商

HTTP 借助 TCP/IP 完成传输, TCP/IP 只关注数据传输, 而 HTTP 还需要对实体数据进行定义.

主要对以下内容进行协商: 

* 数据类型协商实体数据的内容，使用的是 MIME type;

  相关的头字段是 Accept 和 Content-Type；

* 数据编码协商实体数据的压缩方式;

  相关的头字段是 Accept-Encoding 和 Content-Encoding；

* 语言类型协商实体数据的自然语言;

  相关的头字段是 Accept-Language 和 Content-Language；

* 字符集协商实体数据的编码方式;

  相关的头字段是 Accept-Charset 和 Content-Type；

::: warning 注意

客户端通过 `Accept-` 头部字段来与服务器进行内容协商, 但最终决定权在于服务器;

`Accept-` 头部字段可以用 `,` 顺序列出多个可能的选项, 用 `;q=` 参数表示选项权重

:::

## 数据类型协商

MIME(Multipurpose Internet Mail Extensions): 多用途互联网邮件扩展, 早在 HTTP 之前就运用在电子邮件系统, HTTP 采用了一部分用来表示实体数据类型

MIME 将数据分为八大类, 以下是常用的几类:

* text：即文本格式的可读数据，我们最熟悉的应该就是 text/html 了，表示超文本文档，此外还有纯文本 text/plain、样式表 text/css 等。
* image：即图像文件，有 image/gif、image/jpeg、image/png 等。
* audio/video：音频和视频数据，例如 audio/mpeg、video/mp4 等。
* application：数据格式不固定，可能是文本也可能是二进制，必须由上层应用程序来解释。常见的有 application/json，application/javascript、application/pdf 等，另外，**如果实在是不知道数据是什么类型，像刚才说的“黑盒”，就会是 application/octet-stream，即不透明的二进制数据。**

`Accept`:  客户端头部字段表示客户端需要接收的 MIME type;

`Content-Type`: 服务端表示实际返回的 MIME type;

```text
// 表示客户端能够理解的数据类型 -- 浏览器会根据不同 url 来设置不同的 Accept
// 例如 img 图片中的 url, 那么就会期望接收 image 类型
Accept: text/html,application/xhtml+xml,application/xml;q=0.9

// 服务器返回实体数据类型
Content-Type: text/html; charset=UTF-8
```

## 数据编码协商

HTTP 有时为了节约带宽, 会对实体数据进行压缩, 此时就需要告诉客户端压缩方式, 以便客户端进行数据解压

Encoding type: 编码格式, 常见的如下三种:

* gzip：GNU zip 压缩格式，也是互联网上最流行的压缩格式；
* deflate：zlib（deflate）压缩格式，流行程度仅次于 gzip；
* br：一种专门为 HTTP 优化的新压缩算法（Brotli）。

`Accept-Encoding`:  客户端头部字段表示客户端支持的编码格式;

`Content-Encoding`: 服务端表示实际返回编码格式;

::: tip 测试

```tex
Accept-Encoding: gzip, deflate, br
Content-Encoding: gzip
```

<http-test type="Encoding"/>

如果返回了一个浏览器不支持的压缩文件, 浏览器就会判定这个接口失败

当浏览器发现是压缩文件, 会先进行解压再交给调用调用结果

**虽然说压缩文件会将文件大小缩小, 但是需要客户端解压文件, 具体性能是否提升需要根据实际情况**

:::

## 数据语言类型协商

“语言类型”就是人类使用的自然语言，例如英语、汉语、日语等，而这些自然语言可能还有下属的地区性方言

`Accept-Language`:  客户端头部字段表示客户端可理解的自然语言;

`Content-Encoding`: 服务端表示实际返回编码格式;

## 数据字符集类型协商

`Accept-Charset`:  客户端头部字段表示客户端可理解的自然语言;

**响应头里却没有对应的 Content-Charset，而是在 Content-Type 字段的数据类型后面用“charset=xxx”来表示**

::: warning 注意

现在的浏览器都支持多种字符集，通常不会发送 Accept-Charset，而服务器也不会发送 Content-Language，因为使用的语言完全可以由字符集推断出来

:::

## Vary 字段: 内容协商结果

有的时候，服务器会在响应头里多加一个 Vary 字段，记录服务器在内容协商时参考的请求头字段，给出一点信息

```tex
// 表示服务端在内容协商时参考的请求头字段
Vary: Accept-Encoding,User-Agent,Accept
```

## 客户端携带 body 请求体

当客户端携带 body 请求体(一般为 post 请求)时, 也可以通过

`Content-Type` 表示请求体数据的类型和字符集

`Content-Encoding` 表示数据的编码

`Content-Encoding` 表示数据的语言类型

**内容协商是针对报文的实体数据, 对请求报文和响应报文都是通用的**

