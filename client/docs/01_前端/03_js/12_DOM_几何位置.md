---
title: DOM 几何位置
date: 2021-10-21 15:00:00
permalink: /js/geometry
categories:
  - 前端
  - JS
tags:
  - null
---

# 几何位置

几何位置包括元素大小、滚动、坐标以及窗口的大小和滚动。

## 元素几何

这个元素几何的整体图片：

![image-20211203112041399](/img/62.png)

元素具有一下几何属性(从重要性依次排序)：

- **scrollLeft/scrollTop** — 滚动距离。
- **scrollWidth/scrollHeight** — 元素的宽/高 + 内边距 + 滚动距离。**不包括边框、滚动条。**
- **offsetWidth/offsetHeight** — 元素的宽/高 + 滚动条 + 内边距 + 边框。
- **clientWidth/clientHeight** — 元素的宽/高 + 内边距。**不包括边框、滚动条。**
- `offsetParent` — 是最接近的 CSS 定位的祖先，或者是 `td`，`th`，`table`，`body`。
- `offsetLeft/offsetTop` — 是相对于 `offsetParent` 的左上角边缘的坐标。
- `clientLeft/clientTop` — 从元素左上角外角到左上角内角的距离。对于从左到右显示内容的操作系统来说，它们始终是左侧/顶部 border 的宽度。而对于从右到左显示内容的操作系统来说，垂直滚动条在左边，所以 `clientLeft` 也包括滚动条的宽度。

除了 `scrollLeft/scrollTop` 外，所有属性都是只读的。如果我们修改 `scrollLeft/scrollTop`，浏览器会滚动对应的元素。

::: tip 获取滚动条的宽度

```js
const div = document.createElement('div');
div.style.width = '100px';
div.style.height = '100px';
div.style.overflow = 'scroll';

document.body.appendChild(div);
// 没有内边距和边框的情况下，通过 div.offsetWidth - div.clientWidth 公式即可计算出
alert(div.offsetWidth - div.clientWidth);
document.body.removeChild(div);
```

:::

## 文档几何

以下为兼容性较好的，其他见：[JS 教程](https://zh.javascript.info/size-and-scroll-window)

- 文档可见部分的 width/height（内容区域的 width/height）：document.documentElement.clientWidth/clientHeight

- 整个文档的 width/height，其中包括滚动出去的部分：

  ```js
  let scrollHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
  ```

- 文档滚动距离：window.pageYOffset/pageXOffset

## 文档(元素)滚动

::: warning 注意

必须在 DOM 完全构建好之后才能通过 JavaScript 滚动页面。

例如，如果我们尝试通过 `<head>` 中的脚本滚动页面，它将无法正常工作。

:::

### 元素(Element) 滚动

1. 通过更改 `scrollTop/scrollLeft` 来滚动常规元素。
2. [Element.scrollIntoView()](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollIntoView) 方法进行滚动

### 文档滚动

1. 使用 `document.documentElement.scrollTop/scrollLeft` 对页面进行滚动（Safari 除外，而应该使用 `document.body.scrollTop/Left` 代替）。

2. [window.scrollBy(x,y)](https://developer.mozilla.org/zh/docs/Web/API/Window/scrollBy)：将页面滚动至 **相对于当前位置的 `(x, y)` 位置**。

3. [window.scrollTo(pageX,pageY)](https://developer.mozilla.org/zh/docs/Web/API/Window/scrollTo)：将页面滚动至 **绝对坐标。**

### 禁止滚动

要使文档不可滚动，只需要设置 `document.body.style.overflow = "hidden"`。

还需要注意滚动条的存在，如果滚动条存在，在禁止滚动的时候需要计算与滚动条的大小，在 `document.body` 中滚动条原来的位置处通过添加 `padding`，来替代滚动条

## 元素坐标

elem.getBoundingClientRect()：获取指定元素在文档可视区的坐标

![image-20211203154708848](/img/63.png)

1. 相对于文档可视区的坐标 — `elem.getBoundingClientRect()`。

2. 相对于文档的坐标 — `elem.getBoundingClientRect()` 加上当前页面滚动。

   ```js
   // 获取元素的文档坐标
   function getCoords(elem) {
     let box = elem.getBoundingClientRect();

     return {
       top: box.top + window.pageYOffset,
       right: box.right + window.pageXOffset,
       bottom: box.bottom + window.pageYOffset,
       left: box.left + window.pageXOffset,
     };
   }
   ```

## 参考

[JS 教程-Window 大小和滚动](https://zh.javascript.info/size-and-scroll-window)
