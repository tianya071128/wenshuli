---
title: 二进制数据 - ArrayBuffer
date: 2021-10-21 15:00:00
permalink: /js/ArrayBuffer
categories:
  - 前端
  - JS
tags:
  - null
---

# ArrayBuffer

在 Web 开发中，经常会在以下两个场景遇到二进制数据：

* 处理文件；
* 图像处理；

基本的二进制对象是 `ArrayBuffer` ——对固定长度的连续内存空间的引用。

**`ArrayBuffer`** 的特性：

* 它的长度是固定的，我们无法增加或减少它的长度。
* 它正好占用了内存中的那么多空间。
* 要访问单个字节，需要另一个“视图”对象，而不是 `buffer[index]`。

几乎任何对 `ArrayBuffer` 的操作，都需要一个视图。

- 它可以是 TypedArray
  - `Uint8Array`，`Uint16Array`，`Uint32Array` —— 用于 8 位、16 位和 32 位无符号整数。
  - `Uint8ClampedArray` —— 用于 8 位整数，在赋值时便“固定”其值。
  - `Int8Array`，`Int16Array`，`Int32Array` —— 用于有符号整数（可以为负数）。
  - `Float32Array`，`Float64Array` —— 用于 32 位和 64 位的有符号浮点数。
- 或 `DataView` —— 使用方法来指定格式的视图，例如，`getUint8(offset)`。

![image-20211220091518429](/img/66.png)

