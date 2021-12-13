---
title: DOM 事件
date: 2021-10-21 15:00:00
permalink: /js/event
categories:
  - 前端
  - JS
tags:
  - null
---

# DOM 事件

**事件就是文档或浏览器窗口中发生的一些特定的交互瞬间**。在传统软件工程领域，这个模型叫“观察者模式”，其能够做到页面行为（在JavaScript 中定义）与页面展示（在HTML 和CSS 中定义）的分离。

**我们通过事件机制从而在页面的特定时机(图片加载完成、点击等等)执行一些逻辑，通过事件对象获取事件发生时的一些信息。**

::: warning 注意

事件不仅限于 DOM，但这里关注的就是 浏览器 中的事件

:::

## DOM 事件流

![image-20211213112144066](/img/64.png)

事件流描述了页面接收事件的顺序，DOM2 Events 规范规定事件流分为3 个阶段：

1. 捕获阶段（Capturing phase）—— 事件（从 Window）向下走近元素。

   在捕获阶段可以用来实现截获事件。

2. 目标阶段（Target phase）—— 事件到达目标元素。

   ::: tip 提示

   虽然规范上存在”目标阶段“，但是实际上浏览器都没有单独处理这一阶段，捕获阶段和冒泡阶段都会在这一阶段被触发

   :::

3. 冒泡阶段（Bubbling phase）—— 事件从元素上开始冒泡。

::: warning 事件的传播路径

一旦事件确定了传播路径，就会按照顺序执行上述阶段，如果不支持某个阶段，或者事件对象的传播已停止，则将跳过该阶段。

**例如某个元素的 bubbles 属性为 false，则将跳过冒泡阶段。如果调用了 stopPropagation 方法则跳过后续所有阶段**

:::

## 事件处理程序

事件处理程序(事件监听器)就是用来响应事件的函数，用来注册事件处理程序主要有如下方法：

* HTML 事件处理程序：使用事件处理程序的名字以HTML 属性的形式来指定。

  ```html
  <input type="button" value="Click Me" onclick="console.log('Clicked')"/>
  ```

* DOM0 事件处理程序：把一个函数赋值给（DOM 元素的）一个事件处理程序属性。

  ```js
  let btn = document.getElementById("myBtn");
  btn.onclick = function() {
  	console.log("Clicked");
  };
  
  btn.onclick = null; // 移除事件处理程序
  ```

* DOM2 事件处理程序：通过 [addEventListener()](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener) 添加事件，[removeEventListener()](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/removeEventListener) 移除事件

::: warning 对于某些事件，只能通过 addEventListener 设置处理程序

有些事件无法通过 DOM 属性进行分配。只能使用 `addEventListener`。所以 `addEventListener` 更通用。虽然这样的事件是特例而不是规则。

例如，`DOMContentLoaded` 事件，该事件在文档加载完成并且 DOM 构建完成时触发。

```javascript
// 永远不会运行
document.onDOMContentLoaded = function() {
  alert("DOM built");
};

// 这种方式可以运行
document.addEventListener("DOMContentLoaded", function() {
  alert("DOM built");
});
```

:::

## 事件对象

在DOM 中发生事件时，所有相关信息都会被收集并存储在一个名为event 的对象中并传递给事件处理程序

以下为常用的并且在所有事件中都支持的：都是只读属性，[具体见MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Event)

* currentTarget：当前事件处理程序所在的元素
* target：事件目标
* type：被触发的事件类型
* bubbles：表示事件是否冒泡
* stopPropagation()： 用于取消所有后续事件捕获或事件冒泡。只有bubbles为true 才可以调用这个方法
* stopImmediatePropagation()：用于取消所有后续事件捕获或事件冒泡，并阻止调用任何后续事件处理程序（DOM3 Events 中新增）
* cancelable：表示是否可以取消事件的默认行为
* defaultPrevented：true 表示已经调用preventDefault()方法（DOM3Events 中新增）
* preventDefault()：用于取消事件的默认行为。只有cancelable 为true 才可以调用这个方法
* trusted：true 表示事件是由浏览器生成的。false 表示事件是开发者通过JavaScript 创建的（DOM3 Events 中新增）

### 取消冒泡或捕获

事件对象的 stopPropagation() 方法用于取消所有后续事件捕获或事件冒泡。只有 bubbles 为 true 才可以调用这个方法。**具体是取消冒泡还是捕获要看注册事件的类型**

::: warning 注意

1. 几乎所有事件都会冒泡。事件对象为 false 则不会冒泡例如，`focus` 事件不会冒泡。但这仍然是例外，而不是规则，大多数事件的确都是冒泡的。**但是还是在父元素上注册捕获的事件程序**

   <dom-test type="noBubbling" />

2. 注册捕获的事件一般用来拦截子元素的事件，一般情况下不建议使用

   <dom-test type="capture" />

3. event.stopImmediatePropagation()：如果一个元素在一个事件上有多个处理程序，即使其中一个停止冒泡，其他处理程序仍会执行。换句话说，`event.stopPropagation()` 停止向上移动，但是当前元素上的其他处理程序都会继续运行。有一个 `event.stopImmediatePropagation()` 方法，可以用于停止冒泡，并阻止当前元素上的处理程序运行。使用该方法之后，其他处理程序就不会被执行。

<dom-test type="bubbling" />

:::

### 阻止浏览器默认行为

许多事件会自动触发浏览器的默认行为；

- 点击一个链接 —— 触发导航（navigation）到该 URL。
- 点击表单的提交按钮 —— 触发提交到服务器的行为。
- 在文本上按下鼠标按钮并移动 —— 选中文本。

有两种方式来阻止浏览器的默认行为：

- 如果处理程序是使用 `on<event>`（而不是 `addEventListener`）分配的，那返回 `false` 也同样有效。
- 主流的方式是使用 `event` 对象。有一个 `event.preventDefault()` 方法。

#### 不是所有的事件都可以阻止

事件对象的 **cancelable** 属性表示是否可以取消事件的默认行为

::: tip 测试

点击按钮为 window 添加滚动事件，滚动页面，页面是无法被阻止滚动的

<dom-test type="prevent" />

:::

#### **后续事件**

**某些事件**会相互转化。如果我们阻止了第一个事件，那就没有第二个事件了。

例如，在 `<input>` 字段上的 `mousedown` 会导致在其中获得焦点，以及 `focus` 事件。如果我们阻止 `mousedown` 事件，在这就没有焦点了。

::: tip 测试

<dom-test type="prevent2" />

:::

::: warning 注意

只有一些事件会存在这种关系

:::
