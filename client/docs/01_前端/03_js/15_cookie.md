---
title: 数据存储 - cookie
date: 2021-10-21 15:00:00
permalink: /js/cookie
categories:
  - 前端
  - JS
tags:
  - null
---

# cookie

在 JS 中，主要通过 `document.cookie` 对其进行读写，cookie 不是一个数据属性，而是一个访问器(getter/setter)。对其读写会被特殊处理

![image-20211216092146435](/img/65.png)

## 读取 cookie

读取 cookie 就通过 `document.cookie`，返回值为字符串。由 `name=value` 对组成，以 `;` 分隔。每一个都是独立的 cookie。

## 写入 cookie

cookie 的写入操作会触发 cookie 的 setter 方法，方法内部会只更新提到的 cookie，而不会涉及其他 cookie。

虽然 cookie 的名称和值可以是任何字符，为了保持有效的格式，它们应该使用内建的 `encodeURIComponent` 函数对其进行转义

```js
// 特殊字符（空格），需要编码
let name = "my name";
let value = "John Smith"

// 将 cookie 编码为 my%20name=John%20Smith -- 只更新 my name 的 cookie
document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);

alert(document.cookie); // ...; my%20name=John%20Smith -- 展示所有 cookie
```

Cookie 有很多选项，[具体选项参考](/http/cookie/)。但要注意的是，如果一个 cookie 没有设置这 expires，max-age 参数中的任何一个，那么在关闭浏览器之后，它就会消失。此类 cookie 被称为 "session cookie”。

设置选项格式为：`;key=value`，例如：

```js
document.cookie = "user=John; path=/; expires=Tue, 19 Jan 2038 03:14:07 GMT"
```

::: warning 写入限制

这些限制只是浏览器的限制，而不是 HTTP 协议的限制

* `encodeURIComponent` 编码后的 `name=value` 对，大小不能超过 4KB。因此，我们不能在一个 cookie 中保存大的东西。
* 每个域的 cookie 总数不得超过 20+ 左右，具体限制取决于浏览器。

:::

## 封装读取 cookie 的方法

::: details 查看代码

```js
const Cookie = {
  get(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const jar = {};
    for (const cookie of cookies) {
      const parts = cookie.split('=');
      const found = decodeURIComponent(parts[0]);
      const value = parts.slice(1).join('='); // 防止 cookie 的 value 值中存在 =
      jar[found] = decodeURIComponent(value);

      if (name === found) break;
    }

    return name ? jar[name] : jar;
  },
  set(name, value, attributes) {
    attributes = {
      path: '/',
      // 如果需要，可以在这里添加其他默认值
      ...attributes,
    };

    if (attributes.expires instanceof Date) {
      attributes.expires = attributes.expires.toUTCString();
    }

    let updatedCookie =
      encodeURIComponent(name) + '=' + encodeURIComponent(value);

    for (let optionKey in attributes) {
      updatedCookie += '; ' + optionKey;
      let optionValue = attributes[optionKey];
      if (optionValue !== true) {
        updatedCookie += '=' + optionValue;
      }
    }

    document.cookie = updatedCookie;
  },
};

export default {
  ...Cookie,
  remove(name, attributes) {
    Cookie.set(
      name,
      '',
      Object.assign({}, attributes, {
        expires: -1,
      })
    );
  },
};
```

:::

::: warning 注意

* 当我们更新或删除一个 cookie 时，我们应该使用和设置 cookie 时相同的路径和域选项。
* 使用 [js-cookie](https://github.com/js-cookie/js-cookie/tree/0371f69baee31eba40d3200d0e1a2d2b528f0fc8)，浏览器兼容性更佳，封装更好

:::
