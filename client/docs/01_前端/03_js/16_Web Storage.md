---
title: 数据存储 - Web Storage
date: 2021-10-21 15:00:00
permalink: /js/WebStorage
categories:
  - 前端
  - JS
tags:
  - null
---

# Web Storage

Web Storage 的目的是解决客户端存储不需要频繁发送回服务器的数据时使用cookie 的问题。

Web Storage 主要定义了两个对象：localStorage 和sessionStorage。localStorage 是永久存储机制，sessionStorage 是跨会话的存储机制。

## 与 cookie 的区别

1. cookie 每个 HTTP 请求都会发送到服务器，增加传输的数据。Web Storage 只会存储在客户端
2. cookie 存储大小很小，而 Web Storage 大小则大的多，大多数会限制为每个源5MB。
3. cookie 可以被服务器通过响应请求头 `set-cookie` 操作，而 Web Storage 只能在客户端被操作
4. cookie 根据设置的不同可以跟域名、路径绑定。而 Web Storage 只能在同源(协议、域名、端口)绑定，不区分路径。

## localStorage 和 sessionStorage 的区别

| **localStorage**                                   | **sessionStorage**                                     |
| -------------------------------------------------- | ------------------------------------------------------ |
| 在同源的所有标签页和窗口之间共享数据，永久存储机制 | 在**当前浏览器标签页**中可见，包括同源的 iframe        |
| 浏览器重启后数据仍然保留                           | 页面刷新后数据仍然保留（但标签页关闭后数据则不再保留） |

::: tip 提示

sessionStorage 是标签页存活时存储的时候，只要在一个标签页中，即使刷新数据也不会销毁。

:::

## 数据读写

localStorage 和 sessionStorage 都支持以下的方法进行读写：

- `setItem(key, value)` —— 存储键/值对。
- `getItem(key)` —— 按照键获取值。
- `removeItem(key)` —— 删除键及其对应的值。
- `clear()` —— 删除所有数据。
- `key(index)` —— 获取该索引下的键名。
- `length` —— 存储的内容的长度。

如上所述，它就像一个 `Map` 集合（`setItem/getItem/removeItem`），但也允许通过对象属性 `key(index)` 来按索引访问。

### 类对象形式访问

可以通过访问对象一样访问 Web Storage，但不要这样使用：

```js
// 设置 key
localStorage.test = 2;

// 获取 key
alert( localStorage.test ); // 2

// 删除 key
delete localStorage.test;
```

**不要这样使用，不规范，并且这样操作不会触发 `storage` 事件** 

### 写入的数据只能是字符串

键和值必须是字符串。如果是任何其他类型，例数字或对象，它会被自动转换为字符串。

```js
localStorage.user = {name: "John"};
alert(localStorage.user); // [object Object]
```

## storage 事件

当 Web Storage 数据更新时，就会 storage 事件，对象对象中会保存如下信息：

- `key` —— 发生更改的数据的 `key`（如果调用的是 `.clear()` 方法，则为 `null`）。
- `oldValue` —— 旧值（如果是新增数据，则为 `null`）。
- `newValue` —— 新值（如果是删除数据，则为 `null`）。
- `url` —— 发生数据更新的文档的 url。
- `storageArea` —— 发生数据更新的 `localStorage` 或 `sessionStorage` 对象。

::: warning 注意：关于触发时机

重要的是：该事件会在所有可访问到存储对象的 `window` 对象上触发，导致当前数据改变的 `window` 对象除外。

或者说，**当前页面使用的storage被其他页面(或者当前页面的同源 iframe)修改时会触发 storage 事件**（事件在同一个域下的不同页面之间触发，即在A页面注册了storge的监听处理，只有在跟A同域名下的B页面操作storage对象，A页面才会被触发storage事件）

:::

