---
title: 跨站脚本攻击（XSS）
date: 2021-10-21 15:00:00
permalink: /browser/XSS
categories:
  - 前端
  - 浏览器
tags:
  - null
---

# 跨站脚本攻击（XSS）

XSS(Cross Site Scripting - “跨站脚本”)，为了与 "CSS" 区分，故简称 XSS：指黑客往 HTML 文件中或者 DOM 中注入恶意脚本，从而在用户浏览页面时利用注入的恶意脚本对用户实施攻击的一种手段。

::: tip 提示

最开始的时候，这种攻击是通过跨域来实现的，所以叫“跨域脚本”。但是发展到现在，往 HTML 文件中注入恶意代码的方式越来越多了，所以是否跨域注入脚本已经不是唯一的注入手段了，但是 XSS 这个名字却一直保留至今。

:::

## XSS 的危害

当页面被注入了恶意 JavaScript 脚本时，浏览器无法区分这些脚本是被恶意注入的还是正常的页面内容，所以恶意注入 JavaScript 脚本也拥有所有的脚本权限：

* 窃取 Cookie 信息：通过 `“document.cookie”` 获取 Cookie 信息，通过 ajax 技术发送到其他服务器上
* 监听用户行为：通过 `“addEventListener”` 接口监听各类事件，比如监听表单，获取用户输入信息
* 操作 DOM：例如伪造假的登录窗口，生成浮窗广告等等
* 以及其他能够通过脚本做到的事情

## 恶意脚本是怎样注入的

通常情况下，主要有**存储型 XSS 攻击**、**反射型 XSS 攻击**和**基于 DOM 的 XSS 攻击**三种方式来注入恶意脚本。

### 存储型 XSS 攻击

存储型 XSS 攻击大致需要经过如下步骤：

* 利用站点漏洞将一段恶意 JavaScript 代码提交到网站的数据库中；
* 用户向网站请求包含了恶意 JavaScript 脚本的页面；
* 用户浏览该页面的时候，恶意脚本就会将用户的 Cookie 信息等数据上传到服务器。

参考下图：

![img](/img/153.png)

#### 实例

2015 年喜马拉雅就被曝出了存储型 XSS 漏洞。

用户设置专辑名称时，服务器对关键字过滤不严格，比如可以将专辑名称设置为一段 JavaScript，如下图所示：

![img](/img/154.png)

当提交时，喜马拉雅的服务器会保存该段 JavaScript 代码到数据库中。然后当用户打开黑客设置的专辑时，这段代码就会在用户的页面里执行（如下图），这样就可以获取用户的 Cookie 等数据信息。

![img](/img/155.png)

当用户打开黑客设置的专辑页面时，服务器也会将这段恶意 JavaScript 代码返回给用户，因此这段恶意脚本就在用户的页面中执行了。

恶意脚本可以通过 XMLHttpRequest 或者 Fetch 将用户的 Cookie 数据上传到黑客的服务器，黑客拿到了用户 Cookie 信息之后，就可以利用 Cookie 信息在其他机器上登录该用户的账号，并利用用户账号进行一些恶意操作。

### 反射型 XSS 攻击

反射型 XSS 攻击：恶意 JavaScript 脚本属于用户发送给网站请求中的一部分，随后网站又把恶意 JavaScript 脚本返回给用户。当恶意 JavaScript 脚本在用户页面中被执行时，黑客就可以利用该脚本做一些恶意操作。

可以点击如下链接，作用是将 URL 中 xss 参数的内容显示在页面。

* 打开这个<a href="/vuepress_test/security/xss?xss=123" target="_blank">链接</a>，这样在页面中展示就是“123”了
* 打开这个<a href="/vuepress_test/security/xss?xss=<script>alert('你被xss攻击了')</script>" target="_blank">链接</a>，xss 参数的脚本就会被注入到页面中，就会在页面上弹出弹框

::: tip 服务端代码

```js
function xss({ res, query }) {
  // 创建模板
  const html = template(
    require('path').join(__dirname, '../template/tpl-user.art'),
    {
      xss: query.xss,
      title: '反射型 XSS',
    }
  );
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  res.end(html);
},
```

:::

通过上面的示例，反射型 XSS 攻击就是用户将一段含有恶意代码的请求提交给 Web 服务器，Web 服务器接收到请求时，又将恶意代码反射给了浏览器端。

在实际操作中，**黑客经常会通过 QQ 群或者邮件等渠道诱导用户去点击这些恶意链接，所以对于一些链接我们一定要慎之又慎**。

另外需要注意的是，**Web 服务器不会存储反射型 XSS 攻击的恶意脚本，这是和存储型 XSS 攻击不同的地方**。

### 基于 DOM 的 XSS 攻击

基于 DOM 的 XSS 攻击是不涉及到 Web 服务器的。具体来讲，黑客通过各种手段将恶意脚本注入用户的页面中，比如通过网络劫持在页面传输过程中修改 HTML 页面的内容，这种劫持类型很多，有通过 WiFi 路由器劫持的，有通过本地恶意软件来劫持的，它们的共同点是**在 Web 资源传输过程或者在用户使用页面的过程中修改 Web 页面的数据**。

## 如何防范 XSS 攻击

上述 XSS 攻击方式都有一个共同点：就是首先往浏览器中注入恶意脚本，然后再通过恶意脚本将用户信息发送至黑客部署的恶意服务器上。所以要阻止 XSS 攻击，我们可以通过阻止恶意 JavaScript 脚本的注入和恶意消息的发送来实现：

1. 服务端或客户端对输入(输出)的字符进行过滤或转码

   例如，过滤或转码后的字符展示在页面上，也只不过是普通字符：

   ```tex
   code:<script>alert('你被xss攻击了')</script>
   
   # 对其进行过滤后，只存在：
   code:
   
   # 或者对其进行转码：
   code:&lt;script&gt;alert('你被xss攻击了')&lt;/script&gt;
   ```

2. 充分利用[内容安全策略 ( CSP )](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)

   实施严格的 CSP 可以有效地防范 XSS 攻击，具体来讲 CSP 有如下几个功能：

   * 限制加载其他域下的资源文件，这样即使黑客插入了一个 JavaScript 文件，这个 JavaScript 文件也是无法被加载的；
   * 禁止向第三方域提交数据，这样用户数据也不会外泄；
   * 禁止执行内联脚本和未授权的脚本；
   * 还提供了上报机制，这样可以帮助我们尽快发现有哪些 XSS 攻击，以便尽快修复问题。

3. 使用Cookie 的 HttpOnly 属性

   很多 XSS 攻击都是盗用 Cookie 的，此时可以将 Cookie 设置为 HttpOnly 标志，这个 Cookie 只能使用在 HTTP 请求过程中，所以无法通过 JavaScript 来读取这段 Cookie。

4. 使用 https 加强通信过程中的数据安全

   可以使用 https 的安全特性加强数据安全，这样其他人就很难劫持页面数据。

## 参考

* [极客-跨站脚本攻击（XSS）](https://time.geekbang.org/column/article/152807)











