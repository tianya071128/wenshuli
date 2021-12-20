---
title: 二进制数据 - Blob、File、FileReader
date: 2021-10-21 15:00:00
permalink: /js/File
categories:
  - 前端
  - JS
tags:
  - null
---

# Blob、File、FileReader

`ArrayBuffer` 和视图（view）都是 ECMA 标准的一部分，是 JavaScript 的一部分。

在浏览器中，宿主为操作二进制数据还提供了更高级的对象，例如 Blob、File、FileReader。

::: warning 注意

其中 `Blob`、`File` 可以看成是二进制数据的容器(或者是一个指针，指向表示的内存)，而 FileReader 是用来读取` Blob`、`File` 的数据并转化成需要的数据类型(base64、ArrayBuufer、String)

:::

## Blob 接口

`Blob` 对象表示一个**不可变**、原始数据的类文件对象。可以将 `Blob` 看成是一个数据容器，是具有 `type` 标识的数据。

Blob 构成如图：

![image-20211220094138339](/img/67.png)

```js
/**
 * @param {Array} blobParts Blob/BufferSource/String 类型的值的数组。
 * @param {Object} options 其他选项
 *                   - type —— Blob 类型，通常是 MIME 类型，例如 image/png，
 *                   - endings —— 是否转换换行符，使 Blob 对应于当前操作系统的换行符（\r\n 或 \n）。默认为 "transparent"（啥也不做），不过也可以是 "native"（转换）。
 */
new Blob(blobParts, options);

// 从字符串创建 Blob
let blob = new Blob(['<html>…</html>'], { type: 'text/html' });

// 从类型化数组（typed array）和字符串创建 Blob
let hello = new Uint8Array([72, 101, 108, 108, 111]); // 二进制格式的 "hello"

let blob2 = new Blob([hello, ' ', 'world'], { type: 'text/plain' });
```

::: warning Blob 对象是不可变的

我们无法直接在 `Blob` 中更改数据，但我们可以通过 `slice` 获得 `Blob` 的多个部分，从这些部分创建新的 `Blob` 对象，将它们组成新的 `Blob`，等。

这种行为类似于 JavaScript 字符串：我们无法更改字符串中的字符，但可以生成一个新的改动过的字符串。

:::

### Blob 方法或属性

[MDN-Blob](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob)

## File 接口

File 接口提供有关文件的信息，并允许 JavaScript 访问其内容。

File 接口继承至 Blob 接口，所以继承了 Blob 接口的属性和方法：

![image-20211220110255008](/img/68.png)

有两种方式获取它：

1. 与 Blob 类似，使用 File 接口构造器，一般不需要使用。

   ```js
   /**
    * @param {Array} fileParts 一个包含ArrayBuffer，ArrayBufferView，Blob，或者 DOMString 对象的 Array — 或者任何这些对象的组合。这是 UTF-8 编码的文件内容。
    * @param {String} fileName 表示文件名称，或者文件路径。
    * @param {Object} options 其他选项
    *                   - type —— Blob 类型，通常是 MIME 类型，例如 image/png，
    *                   - lastModified —— 数值，表示文件最后修改时间的 Unix 时间戳（毫秒）。
    */
   new File(fileParts, fileName, [options])
   ```

2. 从 `<input type="file">` 或拖放或其他浏览器接口来获取文件。

### File 方法或属性

[MDN-File](https://developer.mozilla.org/zh-CN/docs/Web/API/File)

## FileReader 接口

FileReader 接口是用来**以异步和安全的方式**读取 `Blob` 或 `File`（继承至 `Blob`）的数据，并且读取为指定的数据类型(ArrayBuffer、Base64、String)。

[具体 API 参考 MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/FileReader)

```js
// 利用读取 Blob 数据，读取 File 类似
let debug = { hello: 'world' };
let blob = new Blob([JSON.stringify(debug, null, 2)], {
  type: 'application/json', // 文件 MIME
});
let reader = new FileReader(); // 不需要参数

reader.readAsText(blob);
reader.onload = function() {
  alert(reader.result);
};
```

::: warning 在 Web Workers 中可以使用 FileReaderSync

对于 Web Worker，还有一种同步的 `FileReader` 变体，称为 [FileReaderSync](https://www.w3.org/TR/FileAPI/#FileReaderSync)。

它的读取方法 `read*` 不会生成事件，但是会像常规函数那样返回一个结果。

不过，这仅在 Web Worker 中可用，因为在读取文件的时候，同步调用会有延迟，而在 Web Worker 中，这种延迟并不是很重要。它不会影响页面。

:::

## URL.createObjectURL 方法

在很多情况下，并不需要读取 Blob(File) 的内容，可以直接使用 `URL.createObjectURL` 创建一个唯一的 URL(blob:\<origin>/\<uuid>)。浏览器内部为每个通过 `URL.createObjectURL` 生成的 URL 存储了一个 URL → `Blob` 映射。

```js
let blob = new Blob(['Hello, world!'], {type: 'text/plain'});

let url = URL.createObjectURL(blob);

// 在不需要了的时候需要手动释放
URL.revokeObjectURL(url);
```

::: warning 副作用

创建的 URL 会在文档存活期间会一直存在(在文档退出时自动释放内存)，所以在不需要的时候使用 `URL.revokeObjectURL` 手动释放内存

:::
