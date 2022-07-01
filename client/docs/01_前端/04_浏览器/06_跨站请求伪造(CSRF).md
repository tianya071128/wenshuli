---
title: 跨站请求伪造（CSRF）
date: 2021-10-21 15:00:00
permalink: /browser/CSRF
categories:
  - 前端
  - 浏览器
tags:
  - null
---

# 跨站请求伪造（CSRF）

CSRF(Cross-site request forgery - 跨站请求伪造)：引诱用户打开黑客的网站，在黑客的网站中，利用用户的登录状态发起的跨站请求。简单来讲，**CSRF 攻击就是黑客利用了用户的登录状态，并通过第三方的站点来做一些坏事**。

## CSRF 攻击的方式

主要有三种方式实施 CSRF 攻击，这里以极客时间官网为例子，假设极客时间具有转账功能，可以通过 POST 或 Get 来实现转账，转账接口如下所示：

```tex
# 同时支持POST和Get
# 接口 
https://time.geekbang.org/sendcoin
# 参数
## 目标用户
user
## 目标金额
number
```

### 自动发起 GET 请求

如下黑客第三方站点代码，将转账的请求接口隐藏在 img 标签内，欺骗浏览器这是一张图片资源：

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>黑客的站点：CSRF攻击演示</h1>
    <img src="https://time.geekbang.org/sendcoin?user=hacker&number=100">
  </body>
</html>
```

让用户**进入这个第三方站点**，在页面被加载的时候，浏览器就会发起 img 的资源请求。服务器处理这个转账请求的话，就会将用户账户上的金额转账到指定账号上了。

### 自动发起 POST 请求

如下黑客第三方站点代码，构建一个隐藏表单，在页面加载完成后自动发送 POST 请求：

```html
<!DOCTYPE html>
<html>
<body>
  <h1>黑客的站点：CSRF攻击演示</h1>
  <form id='hacker-form' action="https://time.geekbang.org/sendcoin" method=POST>
    <input type="hidden" name="user" value="hacker" />
    <input type="hidden" name="number" value="100" />
  </form>
  <script> document.getElementById('hacker-form').submit(); </script>
</body>
</html>
```

与发送 GET 请求类似，需要先让用户进入这个第三方站点，在页面加载完成后，通过 JS 脚本自动执行提交到极客时间的服务器，服务器就会执行转账操作

### 引诱用户点击链接

这个方式可以不需要用户进入黑客的第三方站点，这种方式通常出现在论坛或者恶意邮件上。黑客会采用很多方式去诱惑用户点击链接，示例代码如下所示：

```html

<div>
  <img width=150 src=http://images.xuejuzi.cn/1612/1_161230185104_1.jpg> </img> </div> <div>
  <a href="https://time.geekbang.org/sendcoin?user=hacker&number=100" taget="_blank">
    点击下载美女照片
  </a>
</div>
```

一旦用户点击上述链接，就会发送转账的接口(这个接口其实就是 GET 请求)，服务器响应接口进行转账操作

### CSRF 攻击的本质

CSRF 攻击不需要将恶意代码注入用户的页面，仅仅是利用服务器的漏洞和用户的登录状态来实施攻击。

本质上就是引诱用户操作(进入黑客的第三方站点、或点击恶意链接)，最终伪造请求发送到目标服务器，这样用户**登录后存储的 Cookie 也会发送到目标服务器(Cookie 是跟服务器绑定的)**，让服务器执行对应操作。

例如：

```tex
# 用户登录了 time.geekbang.org 的话，假设会以 Cookie 存储登录信息
Cookie：token=xxxx

# 引诱用户点击黑客的第三方站点
xxx.xxx.xx

# 在这三方站点上，发送一个请求到目标服务器
# 利用 <img> 标签自动发送
<img src="https://time.geekbang.org/sendcoin?user=hacker&number=100">

# 发送 GET 请求 https://time.geekbang.org/sendcoin?user=hacker&number=100
# 这个请求被发送到 time.geekbang.org 服务器，而且上面登录后的 Cookie 也会随之发送
# 服务器就会认为是一个存在登录 Cookie 的请求，就会处理这个请求
```

### 示例

这是个真实示例，可以参考该[链接](https://www.davidairey.com/google-gmail-security-hijack)。

在 2007 年的某一天，David 无意间打开了 Gmail 邮箱中的一份邮件，并点击了该邮件中的一个链接。过了几天，David 就发现他的域名被盗了。

结合下图来分析下 David 域名的被盗流程：

![img](/img/156.png)

* 首先 David 发起登录 Gmail 邮箱请求，然后 Gmail 服务器返回一些登录状态给 David 的浏览器，这些信息包括了 Cookie、Session 等，这样在 David 的浏览器中，Gmail 邮箱就处于登录状态了。
* 接着黑客通过各种手段引诱 David 去打开他的链接，比如 hacker.com，然后在 hacker.com 页面中，黑客编写好了一个邮件过滤器，并通过 Gmail 提供的 HTTP 设置接口设置好了新的邮件过滤功能(会携带 Cookie 凭证)，该过滤器会将 David 所有的邮件都转发到黑客的邮箱中。
* 最后的事情就很简单了，因为有了 David 的邮件内容，所以黑客就可以去域名服务商那边重置 David 域名账户的密码，重置好密码之后，就可以将其转出到黑客的账户了。

## 防范 CSRF 攻击

要实施 CSRF 攻击，需要满足如下三个条件：

* 目标站点一定要有 CSRF 漏洞；
* 用户要登录过目标站点，并且在浏览器上保持有该站点的登录状态；
* 需要用户打开一个第三方站点，可以是黑客的站点，也可以是一些论坛。

CSRF 攻击最重要的是借助用户的 Cookie 攻击服务器的漏洞，要让服务器避免遭受到 CSRF 攻击，通常有以下几种途径：

1. 利用 Cookie 的[SameSite 属性](https://web.dev/samesite-cookies-explained/)

   CSRF 攻击会利用用户的 Cookie 发起攻击，以前 Cookie 在第三方站点请求时也会携带，目前 Cookie 的 SameSite 属性正是为了解决这个问题的，通过使用 SameSite 可以有效地降低 CSRF 攻击的风险。

   **SameSite 选项用于声明 Cookie 是否仅限于第一方或者同一站点上下文。SameSite 选项通常有 Strict、Lax 和 None 三个值**：

   * Strict 最为严格：Cookies 只会在第一方上下文中发送，不会与第三方网站发起的请求一起发送。
   * Lax 相对宽松一点：在跨站点的情况下，从第三方站点的链接打开和从第三方站点提交 Get 方式的表单这两种方式都会携带 Cookie。但如果在第三方站点中使用 Post 方法，或者通过 img、iframe 等标签加载的 URL，这些场景都不会携带 Cookie。
   * None：在任何情况下都会发送 Cookie 数据。

   **为了防范 CSRF 攻击，可以将关键的 Cookie 设置为 Strict 或者 Lax 模式这样在跨站点请求时，这些关键的 Cookie 就不会被发送到服务器，从而使得黑客的 CSRF 攻击失效**

2. 验证请求的来源站点

   **在服务器端验证请求来源的站点**：由于 CSRF 大多来自于第三方站点，因此服务器可以禁止来自第三方站点的请求。

   此时可以通过 HTTP 请求头中的 Referer 和 Origin 属性来判断是否是第三方站点：

   * [Referer](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referer)：包含了当前请求页面的来源页面的地址，即表示当前页面是通过此来源页面里的链接进入的
   * [Origin](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Origin)：请求的[来源](https://developer.mozilla.org/zh-CN/docs/Glossary/Origin)（协议、主机、端口）。例如，如果一个用户代理需要请求一个页面中包含的资源，或者执行脚本中的 HTTP 请求（fetch），那么该页面的来源（origin）就可能被包含在这次请求中。

3. 使用 token 来保持登录状态

   CSRF 攻击需要借助 Cookie，而 Cookie 是浏览器自动携带的。

   那么可以使用 token 保持登录态，需要自己添加自定义请求头来携带 token。而第三方站点无法访问到这个 token，也就没有办法发起 CSRF 攻击

## 参考

[极客-CSRF攻击](https://time.geekbang.org/column/article/154110)













