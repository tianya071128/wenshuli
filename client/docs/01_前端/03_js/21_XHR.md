---
title: 网络请求 - XMLHttpRequest
date: 2021-10-21 15:00:00
permalink: /js/xhr
categories:
  - 前端
  - JS
tags:
  - null
---

# XMLHttpRequest

XMLHttpRequest 用来与服务器交互(大多数是支持 HTTP 协议，但也可以其他协议)。**可以在不刷新页面的情况下请求特定 URL，获取数据**

## 属性、方法、事件

[参考-MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest)

## 基础的例子

::: details 查看代码

```js
// 第一步；创建 xhr 对象
const xhr = new XMLHttpRequest();
// 第二步：配置请求基础
request.open('GET', '/vuepress_test/html/getImg');

// 第三步：为请求配置属性或事件
request.responseType = 'blob'; // 配置响应数据类型
request.setRequestHeader(); // 配置请求头字段，需在 open 方法之后配置
request.onload = function() {
  // request.response 服务器返回的数据
};

// 第四步：发送请求
request.send(); // 如果是 POST 请求，那么就需要请求数据作为参数
```

:::

## 请求数据类型

请求上送的数据类型通过设置 `xhr.setRequestHeader('Content-type', MIME 类型);` 。其中 MIME 类型可参考：[MDN - MIME 类型](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_types)

但最常用的如下几种：

* application/json：目前使用最多的；
* multipart/form-data: 上送文件使用;
* application/x-www-form-urlencoded：格式为 `name=123&age=123`，比较少使用

::: warning 注意

并不是说只有上述几种可以使用，合法的 MIME 类型是可以使用的，Content-Type 的作用是告诉服务器我们上送的数据类型，服务器就可以对我们上送的数据类型正确的解析。

:::

## 响应数据类型

通过 `xhr.responseType` 属性设置响应的数据类型，有如下几种：

- `""`（默认）—— 响应格式为字符串，
- `"text"` —— 响应格式为字符串，
- `"arraybuffer"` —— 响应格式为 `ArrayBuffer`（对于二进制数据，请参见 [ArrayBuffer，二进制数组](https://zh.javascript.info/arraybuffer-binary-arrays)），
- `"blob"` —— 响应格式为 `Blob`（对于二进制数据，请参见 [Blob](https://zh.javascript.info/blob)），
- `"document"` —— 响应格式为 XML document（可以使用 XPath 和其他 XML 方法），
- `"json"` —— 响应格式为 JSON（自动解析）。

当设置了响应数据类型后，就会按照指定类型来解析响应数据，响应返回后在 `xhr.response` 中获取到响应数据

## 跨域及 Cookie 问题

需要在跨域时发送 Cookie，需要在客户端设置 `xhr.withCredentials = true`，具体跨域需要服务端设置

[此问题详情参考](/http/cors/#跨域-cookie)

## 上传进度、加载(响应)进度、取消请求、设置超时时间

### 上传进度

`xhr.upload` 返回一个 `XMLHttpRequestUpload` 对象，这个对象用来表示上传的进度。

可以在 `load`、`progress`、`error` 等事件中获取上传进度，[MDN-upload](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/upload)

### 加载(响应)进度

在 `xhr` 的 `progress` 事件中周期性的触发。

### 取消请求

调用`xhr.abort()`即可，会触发 `abort` 请求。

### 设置超时时间

设置 `xhr.timeout` 属性即可，超时会触发 `timeout` 事件。

如果设置为 0，表示无超时时间

### 例子

<dom-test type="xhrExample" />

::: warning 注意

* 如果使用 `loadend` 事件，会在请求结束后触发，**没有方法可以确切的知道 `loadend` 事件接收到的信息是来自何种条件引起的操作终止；**
* 取消请求不会触发 `error` 事件，可以在 `abort` 事件中处理，同理，`timeout` 事件也是如此
* 在 Node 中，取消或超时可以通过 [`close`](http://nodejs.cn/api/http.html#event-close_2) 事件通知

:::

::: details 查看代码

```js
function updateFile(file) {
  this.updateStatus = '';
  this.updateProgress = 0;
  this.responseStatus = '';
  this.responseProgress = 0;

  let fromData = new FormData();
  fromData.append('file', file);

  const xhr = new XMLHttpRequest();
  let result = null;
  // 处理请求结果
  let handleEnd = () => {
    if (result.isSuccess) {
      if (xhr.status === 200) {
        this.responseStatus = 'success';
      } else {
        this.$message.error(xhr.response);
        this.responseStatus = 'exception';
      }
    } else {
      this.responseStatus = 'exception';
      this.$message.error(result.msg);
    }
    this.xhr = null;
  };

  xhr.open('POST', '/vuepress_test/html/xhr');
  xhr.getResponseHeader('Content-Type', 'multipart/form-data');
  // 设置超时时间
  xhr.timeout = this.timeout || 0;

  /** 为 xhr 监听各种事件 */
  /** xhr 事件监听 */
  xhr.onerror = () => {
    console.log('是否失败？ -- onerror');
    result = {
      isSuccess: false,
      msg: '请求出错',
    };
    handleEnd();
  };
  xhr.onabort = () => {
    console.log('是否取消 -- abort');
    result = {
      isSuccess: false,
      msg: '请求取消',
    };
    handleEnd();
  };
  xhr.ontimeout = () => {
    console.log('是否超时 -- timeout');
    result = {
      isSuccess: false,
      msg: '请求超时',
    };
    handleEnd();
  };
  xhr.onload = () => {
    result = {
      isSuccess: true,
      msg: '请求成功',
    };
    handleEnd();
  };

  /** 响应进度事件 */
  xhr.onprogress = (event) => {
    if (event.lengthComputable) {
      // 已知响应大小
      this.responseProgress = Math.ceil((event.loaded / event.total) * 100);
    }
  };

  /** 上传进度事件 */
  xhr.upload.onprogress = (event) => {
    setTimeout(() => {
      if (result && !result.isSuccess) return;
      // 奇怪的是，如果将网络调试断开，那么这个进度事件也会触发并且 event.loaded === event.total
      // 但是如果是取消了的话，就不会被触发
      // 所以我们需要判断一下是否请求出错
      // 因为这个事件优先于 xhr.onerror 事件，所以我们就需要延迟一下执行
      this.updateProgress = Math.ceil((event.loaded / event.total) * 100);
    }, 0);
  };
  xhr.upload.onloadend = () => {
    // 无论成功与否都会触发，就可以在这里检测是否上传成功
    setTimeout(() => {
      this.updateStatus = this.updateProgress === 100 ? 'success' : 'exception';
    }, 0);
  };

  xhr.send(fromData);

  // 赋值给 this
  this.xhr = xhr;
}
```

:::

## 参考

* [MDN-使用 XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest)
* [JS 教程-XMLHttpRequest](https://zh.javascript.info/xmlhttprequest)

