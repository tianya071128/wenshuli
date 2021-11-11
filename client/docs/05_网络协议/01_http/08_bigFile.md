---
title: HTTP 传输大文件
date: 2021-10-21 15:00:00
permalink: /http/bigFile
categories: 
  - 其他
  - HTTP
tags: 
  - null
---
# HTTP 传输大文件

现在网络的资源越来越大, HTTP 也就需要高效快速的传输这些大文件

HTTP/1.1 是一个文本协议, 需要通过一定的规则来判断报文的起始和结束. HTTP 通过单独的 TCP 通道传输数据, 那么判断报文结束也就是下一个报文的开始, 那么重点在于判断报文的结束. 请求(响应)行和头部字段是固定的结构比较好判断, 重要在于判断实体数据的结束.

在 HTTP/1.1 中, 是通过 `Content-Length: size(固定长度)` 或 `Transfer-Encoding: chunked` 来判断实体数据的结束

`Content-Length: 628`: 标识了实体数据的长度, 就可以判断出实体数据的结束以及报文的结束

`Transfer-Encoding: chunked`: 标识了实体数据是不确定长度的, 使用流式传输, HTTP 层会对数据进行封装, 最后会采用 CRLF(空行) 标识实体数据的结束以及报文的结束

::: warning 注意

**“Transfer-Encoding: chunked”和“Content-Length”这两个字段是互斥的，也就是说响应报文里这两个字段不能同时出现，一个响应报文的传输要么是长度已知，要么是长度未知（chunked），这一点你一定要记住。**

:::

## 数据压缩

采用 gzip、deflate、br 等压缩方式传输数据, 传输的数据就能够减少, 但是增加了压缩和解压的时间.

## 分块传输

HTTP 层将数据分块后给 TCP 进行传输, 客户端也就可以每次接收一部分数据进行处理(当然在浏览器会等待数据全部传输完成再交给应用), 将数据化整为零

HTTP 在响应报文里用头字段“Transfer-Encoding: chunked”来表示，意思是报文里的 body 部分不是一次性发过来的，而是分成了许多的块（chunk）逐个发送。

HTTP 层会对分块传输的数据进行再次编码， 编码规则如图：

![img](/img/09.png)

[本章节主要见极客文章](https://time.geekbang.org/column/article/104456)