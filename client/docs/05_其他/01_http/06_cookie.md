---
title: HTTP cookie
date: 2021-10-21 15:00:00
permalink: /http/cookie
categories: 
  - 其他
  - HTTP
tags: 
  - null
---
# Cookie

HTTP 是 "无状态" 的, 而为了让其变得 "有状态", 就衍生了 cookie 机制.

cookie 是服务器颁发给客户端的凭证, 存储在客户端的, 是 "浏览器绑定" 的, 换台电脑或浏览器就不会共享这个 cookie

当每次发送 HTTP 请求时, 浏览器就会自动携带这个 cookie, 这样服务器就可以识别用户了

**Cookie 存储大小一般为 4 k**

## Cookie 相关头字段

响应头字段 Set-Cookie 和请求头字段 Cookie。

### Set-Cookie: 设置 cookie

 服务器通过响应头字段 `Set-Cookie` 通知浏览器设置其 cookie, 可以通过设置多个 `Set-Cookie` 响应头字段来设置多个 cookie

服务器通过 `Set-Cookie: key=value;Max-Age=10;Domain=www.chrono.com;...` 格式设置 Cookie, 浏览器接收到后就会将其设置保存起来

### Cookie:  发送 Cookie

客户端发送 HTTP 时, 会根据域名来筛选合适的 Cookie, 发送相对应的 Cookie 给服务器

## Cookie 的属性

一般来说, Cookie 中的信息都比较重要, 就需要一些额外手段来具体设置 Cookie

### 过期时间: Expires 和 Max-Age

`Expires` 和 `Max-Age` 属性设置 cookie 的过期时间, 当超过设置的时间后浏览器就会判定 Cookie 失效, 从而删除 Cookie

* Expires: 绝对时间, 形式为符合 HTTP-date 规范的时间戳。. e.g; `Expires: Fri, 07-Jun-19 08:19:00 GMT;`

* Max-Age: 相对时间, 在 cookie 失效之前需要经过的秒数, 单位为秒. e.g: `Max-Age: 10`

当两者同时出现时, 优先采用 `Max-Age` 属性

::: tip 提示

很多头部字段设置过期时间的时候都会采用两个绝对和相对时间值, 但优先采用相对时间值.

因为客户端和服务端的时间可能不一样, 采用绝对时间时, 时间值不一定准确.

:::

### 作用域: Domain 和 Path

`Domain` 和 `Path` 属性设置 Cookie 的作用域, 让浏览器仅发送特定的服务器和 URI, 避免被其他网站盗用

浏览器在发送 Cookie 时, 就会从 URI 中提取出 host 和 path 部分, 对比 Domain 和 Path 属性, 符合条件才会发送 Cookie

* Domain: 设置 Cookie 的访问域名,  默认为当前域名. 可以设置父域名(一级域名), 那么子域名也就可以访问(二级域名)

  > 例如设置 `Domain: .test.com` , 那么下面的子域名 `a.test.com`, `b.test.com` 都可以访问
  >
  > 通常使用这一特性可以实现单点登录效果

* Path: 设置 Cookie 的主机下访问路径, 默认为 /

### 安全性: HttpOnly 和 Secure 和 SameSite

Cookie 一般带有用户信息的凭证, 需要保证 Cookie 一定的安全性

* HttpOnly: 设置此 Cookie 不能通过 `document.cookie` 访问 Cookie

* Secure: 设置此 Cookie 只能通过 HTTPS 协议传输, 但 Cookie 本身不是加密的，浏览器里还是以明文的形式存在。

* SameSite: 设置此 Cookie 是否在跨站时发送

  * `None `浏览器会在同站请求、跨站请求下继续发送 cookies，不区分大小写。
  * `Strict` 浏览器将只在访问相同站点时发送 cookie。（在原有 Cookies 的限制条件上的加强，如上文 “Cookie 的作用域” 所述）
  * `Lax` 与 `Strict` 类似，但用户从外部站点导航至URL时（例如通过链接）除外。 在新版本浏览器中，为默认选项，Same-site cookies 将会为一些跨站子请求保留，如图片加载或者 frames 的调用，但只有当用户从外部站点导航到URL时才会发送。

  ::: warning 注意

  Cookie 是跟域名绑定在一起的, 如果发送 HTTP 请求的域名不符合 Cookie 的条件, 那么此 Cookie 就不会发送.

  当在浏览器标签页打开一个页面时, 页面发送的 HTTP 请求如果产生了跨站(注意不是跨域)的话, 是否发送这个 HTTP 请求的 Cookie, 就需要根据这个 Cookie 的 SameSite 属性来判断

  例如在 a.test.com 中通过表单发送给 b.test2.com 数据, 那么是否发送 属于 b.test2.com 的 Cookie?

  首先需要筛选出符合 b.test2.com 作用域的 Cookie, 其次判断这个请求是否跨站了(在这个例子是跨站的), 根据 SameSite 属性判断跨站是否能够发送 Cookie. 

  **记住, Cookie 是跟域名绑定的, 需要判断这个 Cookie 是否发送, 需要根据 HTTP 请求的域名以及当前页面 URI 综合判断**

  :::

  参考文档: [SameSite 属性](https://www.ruanyifeng.com/blog/2019/09/cookie-samesite.html)、[SameSite 小识](https://zhuanlan.zhihu.com/p/121048298)

  ## 跨域 Cookie
  待续

