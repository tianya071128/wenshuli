---
title: DOM 事件类型
date: 2021-10-21 15:00:00
permalink: /js/eventType
categories:
  - 前端
  - JS
tags:
  - null
---

# 事件类型

浏览器定义了很多中事件。所发生的事件的类型决定了事件对象中会保存什么信息。DOM3 Events 定义了的事件类型如下：

* 用户界面事件（UIEvent）：涉及与BOM 交互的通用浏览器事件。
* 焦点事件（FocusEvent）：在元素获得和失去焦点时触发。
* 鼠标事件（MouseEvent）：使用鼠标在页面上执行某些操作时触发。
* 滚轮事件（WheelEvent）：使用鼠标滚轮（或类似设备）时触发。
* 输入事件（InputEvent）：向文档中输入文本时触发。
* 键盘事件（KeyboardEvent）：使用键盘在页面上执行某些操作时触发。
* 合成事件（CompositionEvent）：在使用某种IME（Input Method Editor，输入法编辑器）输入字符时触发。
* 除了这些事件类型之外，HTML5 还定义了另一组事件，而浏览器通常在DOM和BOM上实现专有事件。这些专有事件基本上都是根据开发者需求而不是按照规范增加的，因此不同浏览器的实现可能不同。

[这是一份事件参考](https://developer.mozilla.org/zh-CN/docs/Web/Events)

## 用户界面事件

| 事件名称 | 触发时机                                                     |
| -------- | ------------------------------------------------------------ |
| load     | 在window 上当页面加载完成后触发，在窗套（\<frameset>）上当所有窗格（\<frame>）都加载完成后触发，在\<img>元素上当图片加载完成后触发，在\<object>元素上当相应对象加载完成后触发。 |
| unload   | 在window 上当页面完全卸载后触发，在窗套上当所有窗格都卸载完成后触发，在\<object>元素上当相应对象卸载完成后触发。 |
| abort    | 在\<object>元素上当相应对象加载完成前被用户提前终止下载时触发。 |
| error    | 在window 上当JavaScript 报错时触发，在\<img>元素上当无法加载指定图片时触发，在\<object>元素上当无法加载相应对象时触发，在窗套上当一个或多个窗格无法完成加载时触发。 |
| select   | 在文本框（\<input>或textarea）上当用户选择了一个或多个字符时触发。 |
| resize   | 在window 或窗格上当窗口或窗格被缩放时触发。                  |
| scroll   | 当用户滚动包含滚动条的元素时在元素上触发。\<body>元素包含已加载页面的滚动条。 |



### load：加载完成

1. 对于 window 对象上，load 事件会在整个页面（包括所有外部资源如图片、JavaScript 文件和CSS 文件）加载完成后触发。

2. 对于图片，在图片加载完成后触发。**下载图片并不一定要把\<img>元素添加到文档，只要给它设置了src 属性就会立即开始下载。**

   <dom-test type="imgLoad" />

   ::: details 查看代码

   ```js
   let image = document.createElement('img');
   image.addEventListener('load', (event) => {
     alert('图片加载完成');
   });
   image.src = '/img/64.png';
   ```

   :::

3. 对于脚本，在脚本加载完成后触发。**与图片不同，要下载JavaScript 文件必须同时指定src 属性并\<script>元素添加到文档中。**

   **值得注意的是，会先执行加载的脚本，在执行 load 事件，这也是 webpack 中获取异步 chunk 时的原理**

   <dom-test type="jsLoad" />

   ::: details 查看代码

   ```js
   let script = document.createElement('script');
   script.addEventListener('load', (event) => {
     alert('脚本加载并执行完成');
   });
   script.src = '/js/test.js';
   document.body.appendChild(script);
   ```

   :::

## 焦点事件

| 事件名称 | 触发时机                                         |
| -------- | ------------------------------------------------ |
| blur     | 失去焦点，不会冒泡                               |
| focus    | 当元素获得焦点时触发。不会冒泡                   |
| focusin  | 当元素获得焦点时触发。这个事件是focus 的冒泡版。 |
| focusout | 当元素失去焦点时触发。这个事件是blur 的通用版。  |

。。。

事件还是查看列表吧
