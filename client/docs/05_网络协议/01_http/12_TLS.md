---
title: TLS 的连接过程
date: 2021-10-21 15:00:00
permalink: /http/TLS
categories: 
  - 其他
  - HTTPS
tags: 
  - null
---
# TLS 的连接过程

HTTPS 也就是 HTTP + SSL/TLS + 数字证书，HTTPS 的连接过程也同样要先经过 TCP 层的三次握手建立 TCP 连接，**然后在通过 TLS 建立安全通道，之后就可以通过这个安全通道进行 HTTP 通信了。**

**这个“握手”过程与 TCP 有些类似，是 HTTPS 和 TLS 协议里最重要、最核心的部分，懂了它，就“掌握了 HTTPS”。**

## TLS 协议的组成

TLS 包含几个子协议，你也可以理解为它是由几个不同职责的模块组成，比较常用的有记录协议、警报协议、握手协议、变更密码规范协议等。

* 记录协议（Record Protocol）规定了 TLS 收发数据的基本单位：记录（record）。它有点像是 TCP 里的 segment，所有的其他子协议都需要通过记录协议发出。**但多个记录数据可以在一个 TCP 包里一次性发出，也并不需要像 TCP 那样返回 ACK。**
* 警报协议（Alert Protocol）的职责是向对方发出警报信息，有点像是 HTTP 协议里的状态码。比如，protocol_version 就是不支持旧版本，bad_certificate 就是证书有问题，收到警报后另一方可以选择继续，也可以立即终止连接。
* 握手协议（Handshake Protocol）是 TLS 里最复杂的子协议，要比 TCP 的 SYN/ACK 复杂的多，浏览器和服务器会在握手过程中协商 TLS 版本号、随机数、密码套件等信息，然后交换证书和密钥参数，最终双方协商得到会话密钥，用于后续的混合加密系统。
* 变更密码规范协议（Change Cipher Spec Protocol），它非常简单，就是一个“通知”，告诉对方，后续的数据都将使用加密保护。那么反过来，在它之前，数据都是明文的。

下面的这张图简要地描述了 TLS 的握手过程，其中每一个“框”都是一个记录，多个记录组合成一个 TCP 包发送。所以，最多经过两次消息往返（4 个消息）就可以完成握手，然后就可以在安全的通信环境里发送 HTTP 报文，实现 HTTPS 协议。

![img](/img/17.png)

## TLS/1.2 的握手过程

**握手的目标是安全地交换对称密钥，需要三个随机数，第三个随机数“Pre-Master”必须加密传输，绝对不能让黑客破解；**

![img](/img/18.png)

如图：

1. TCP 三次握手建立 TCP 连接

2. 浏览器会首先发一个“Client Hello”消息，也就是跟服务器“打招呼”。里面有客户端的版本号、支持的密码套件，还有一个随机数（Client Random），用于后续生成会话密钥。

   ```tex
   
   Handshake Protocol: Client Hello
       Version: TLS 1.2 (0x0303) # 支持的 TLS 版本
       Random: 1cbf803321fd2623408dfe…
       Cipher Suites (17 suites) # 密码套件
           Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (0xc02f)
           Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (0xc030)
   ```

3. 以下服务器几个”记录”通过一个 TCP 包发送

   1. 服务器返回一个 “Sever Hello” 消息，把版本号对一下，也给出一个随机数（Server Random），然后从客户端的列表里选一个作为本次通信使用的密码套件，例如选择了“TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384”。

      ```tex
      Handshake Protocol: Server Hello
          Version: TLS 1.2 (0x0303) # 相对应的 TLS 版本
          Random: 0e6320f21bae50842e96…
          Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (0xc030) # 从可选密码套件中选择一个
      ```

   2. 服务器发送自己的证书(证书链)发给客户端

   3. 关键的操作：因为服务器选择了 ECDHE 算法，所以它会在证书后发送“Server Key Exchange”消息，**里面是椭圆曲线的公钥（Server Params），用来实现密钥交换算法，再加上自己的私钥签名认证。**

      ```tex
      Handshake Protocol: Server Key Exchange
          EC Diffie-Hellman Server Params
              Curve Type: named_curve (0x03)
              Named Curve: x25519 (0x001d)
              Pubkey: 3b39deaf00217894e...
              Signature Algorithm: rsa_pkcs1_sha512 (0x0601)
              Signature: 37141adac38ea4...
      ```

   4. 服务器发送 “Server Hello Done”消息，服务器说：“我的信息就是这些，打招呼完毕。”

4. **前三步第一个消息往返就结束了（两个 TCP 包），结果是客户端和服务器通过明文共享了三个信息：Client Random、Server Random 和 Server Params。**

   以下浏览器几个记录一个 TCP 包发送

   1. 客户端进行证书链逐级验证，确认证书的有效性，再用证书公钥验证签名，就确认了服务器的身份，然后，客户端按照密码套件的要求，也生成一个椭圆曲线的公钥（Client Params），用“Client Key Exchange”消息发给服务器。

      ```tex
      Handshake Protocol: Client Key Exchange
          EC Diffie-Hellman Client Params
              Pubkey: 8c674d0e08dc27b5eaa…
      ```

   2. 现在客户端和服务器手里都拿到了密钥交换算法的两个参数（Client Params、Server Params），就用 ECDHE 算法一阵算，算出了一个新的东西，叫“Pre-Master”，其实也是一个随机数。

      现在客户端和服务器手里有了三个随机数：Client Random、Server Random 和 Pre-Master。用这三个作为原始材料，**就可以生成用于加密会话的主密钥，叫“Master Secret”（加密密钥）**。而黑客因为拿不到“Pre-Master”，所以也就得不到主密钥。

      为什么非得这么麻烦，非要三个随机数呢？这就必须说 TLS 的设计者考虑得非常周到了，他们不信任客户端或服务器伪随机数的可靠性，为了保证真正的“完全随机”“不可预测”，把三个不可靠的随机数混合起来，那么“随机”的程度就非常高了，足够让黑客难以猜测。

   3. 客户端发一个“Change Cipher Spec”，然后再发一个“Finished”消息，把之前所有发送的数据做个摘要，再加密一下，让服务器做个验证。

5. 服务器也是同样的操作，发“Change Cipher Spec”和“Finished”消息，双方都验证加密解密 OK，握手正式结束，后面就收发被加密的 HTTP 请求和响应了。

::: tip 提示

上述描述的是主流的 TLS 握手过程，而传统的握手过程有两点不同：

1. 使用 ECDHE 实现密钥交换，而不是 RSA，所以会在服务器端发出“Server Key Exchange”消息。
2. 因为使用了 ECDHE，客户端可以不用等到服务器发回“Finished”确认握手完毕，立即就发出 HTTP 报文，省去了一个消息往返的时间浪费。

:::

### 传统的 TLS 握手 - 基于 RSA

![img](/img/19.png)

大体的流程没有变，只是“Pre-Master”不再需要用算法生成，而是客户端直接生成随机数，然后用服务器的公钥加密，通过“Client Key Exchange”消息发给服务器。服务器再用私钥解密，这样双方也实现了共享三个随机数，就可以生成主密钥。

### 双向认证 - 客户端证书

一般而言，我们只需要认证服务端证书，但在安全要求较高的领域，有的时候（比如网上银行）还会使用 U 盾给用户颁发客户端证书，实现“双向认证”，这样会更加安全。

**双向认证的流程也没有太多变化，只是在“Server Hello Done”之后，“Client Key Exchange”之前，客户端要发送“Client Certificate”消息，服务器收到后也把证书链走一遍，验证客户端的身份。**

## TLS/1.3 的握手过程

TLS/1.2 在 2008 年发布，随着时代的发展，在 2018 年推出了 TLS/1.3 协议。

暂时略

具体见 [极客 - TLS1.3特性解析](https://time.geekbang.org/column/article/110718)

## 参考

* [极客-TLS1.2连接过程解析](https://time.geekbang.org/column/article/110354)
* [极客 - TLS1.3特性解析](https://time.geekbang.org/column/article/110718)

