---
title: DOM 节点操作
date: 2021-10-21 15:00:00
permalink: /js/DOMAPI
categories:
  - 前端
  - JS
tags:
  - null
---

# DOM API

这里主要介绍常用的，其他的可参考：

[MDN-DOM 接口](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model)

[菜鸟教程](https://www.runoob.com/jsref/dom-obj-document.html)

## 节点关系

- children 属性: 访问子节点; childNodes 的元素版
- firstElementChild 属性: 指向第一个子元素;firstChild 的元素版
- lastElementChild 属性: 指向最后一个子元素; lastChild 的元素版
- previousElementSibling 属性: 指向前一个同辈元素; previousSibling 的元素版
- nextElementSibling 属性: 指向后一个同辈元素; nextSibling 的元素版
- parentNode 属性: 访问父节点
- ownerDocument 属性: 表示整个文档的文档节点
- hasChildNodes()方法: 包含一或多个子节点时返回 true
- childElementCount 属性: 返回子元素(不包含文本节点和注释)的个数。

::: warning 注意

这几个 API 会返回注释或文本节点，兼容 IE8-，但不常用：

- previousSibling 属性: 上一个子节点, 对于第一个节点, 属性值为 null
- nextSibling 属性: 下一个子节点, 对于最后一个节点, 属性值为 null
- firstChild 属性: 访问父节点的第一个子节点
- lastChild 属性: 访问父节点的最后一个子节点
- childNodes 属性: 访问子节点

:::

## 查找节点

- document.getElementById(_elementID_)：返回对拥有指定 ID 的第一个对象的引用。

  ::: warning 注意

  这个不能在元素对象上使用，只在 document 对象上存在这个方法，这个方法在 Document 类型上存在，而在 Element 类型上没有实现

  :::

- getElementsByClassName(_classname_)：返回文档中所有指定类名的元素集合，作为 NodeList 对象。

- querySelector(_CSS 选择器_)：返回匹配指定 CSS 选择器元素的第一个子元素 。

- querySelectorAll(selectors)：返回文档中匹配指定 CSS 选择器的所有元素，返回 NodeList 对象。

- element.matches(css 选择器字符串): 如果元素匹配则该选择符返回 true，否则返回 false._注意兼容性。_

- 特殊集合

  ```js
  document.anchors // 包含文档中所有带name特性的<a>元素
  document.forms // 包含文档中所有的<form>元素
  document.images // 包含文档中所有的 <img> 元素
  document.links// 包含文档中所有带 href特性的 <a> 元素。
  ...
  ```

## 创建节点

- `document.createElement(tag)` — 用给定的标签创建一个元素节点，
- `document.createTextNode(value)` — 创建一个文本节点（很少使用），
- `elem.cloneNode(deep)` — 克隆元素，如果 `deep==true` 则与其后代一起克隆。
- `document.createDocumentFragment()`：创建文档片段

## 操作节点

- _element_.appendChild(_node_)：向节点的子节点列表的末尾添加新的子节点。
- _element_.insertBefore(_newnode,existingnode_)：在已有的子节点前插入一个新的子节点。
- _element_.replaceChild(_newnode_,_oldnode_)：将某个子节点替换为另一个。
- _element_.removeChild(_node_)：从子节点列表中删除某个节点。
- _element_.compareDocumentPosition(_node_)：按照文档顺序，比较当前节点与指定节点的文档位置。
- innerHTML 属性: 返回与调用元素的所有子节点(包括元素、注释和文本节点）对应的 HTML 标记 -- 可读写
- outerHTML 属性: 返回与调用它的元素及所有子节点(包括元素、注释和文本节点）对应的 HTML 标记 -- 可读写

## 特性、属性操作

### 特性、属性的对比

- 特性（attribute）— 写在 HTML 中的内容。
- 属性（property）— DOM 对象中的内容。

简略的对比：

|      | 属性                                   | 特性                         |
| :--- | :------------------------------------- | :--------------------------- |
| 类型 | 任何值，标准的属性具有规范中描述的类型 | 字符串                       |
| 名字 | 名字（name）是大小写敏感的             | 名字（name）是大小写不敏感的 |

操作特性的方法：

- `elem.hasAttribute(name)` — 检查是否存在这个特性。
- `elem.getAttribute(name)` — 获取这个特性值。
- `elem.setAttribute(name, value)` — 设置这个特性值。
- `elem.removeAttribute(name)` — 移除这个特性。
- `elem.attributes` — 所有特性的集合。

在大多数情况下，最好使用 DOM 属性。仅当 DOM 属性无法满足开发需求，并且我们真的需要特性时，才使用特性，例如：

- 我们需要一个非标准的特性。但是如果它以 `data-` 开头，那么我们应该使用 `dataset`。
- 我们想要读取 HTML 中“所写的”值。对应的 DOM 属性可能不同，例如 `href` 属性一直是一个 **完整的** URL，但是我们想要的是“原始的”值。

::: warning 注意

特性和属性几乎可以看成一个东西，但是有一些区分

[JS 教程-特性和属性](https://zh.javascript.info/dom-attributes-and-properties)

[stackoverflow](https://stackoverflow.com/questions/10280250/getattribute-versus-element-object-properties)

:::

### 自定义数据属性：dataset

dataset 属性的值是 DOMStringMap 的一个实例. 在这个实例中, 每个 data-name 形式的属性都会有一个对应的属性, \*_属性名没有 data-前缀_

```js
// 示例
var div = document.getElementById('myDiv');

//取得自定义属性的值
var appId = div.dataset.appId;
var myName = div.dataset.myname;

//设置值
div.dataset.appId = 23456;
div.dataset.myname = 'Michael';
```

## 节点 class 管理

管理 class，主要有两种方式：

### className

是一个字符串值，是管理 Element 元素的整个类，并不好操作。

### classList

H5 推出的专门用来管理类的，classList 是一个新的集合类型 DOMTokenList 的实例。

```js
// 示例
var div = document.getElementById('myDiv');

div.classList.add(value); // 将给定的字符串值添加到列表中, 如果值已经存在, 就不添加了
div.classList.contains(value); // 表示列表中是否存在给定的值
div.classList.remove(value); // 从列表中删除给定的字符串
div.classList.toggle(value); // 如果列表中已经存在给定的值, 删除它; 如果列表中没有给定的值, 添加它
```

## 节点 style 管理

管理 style，通常有如下方式：

### style 对象

`element.style` 返回的是一个 `CSSStyleDeclaration` 对象，它是一个 CSS 声明块，CSS 属性键值对的集合。[对象上存在样式信息和各种与样式相关的方法和属性](https://developer.mozilla.org/zh-CN/docs/Web/API/CSSStyleDeclaration)

一般通过 `element.style.[属性]` 进行样式的读写，其他 `CSSStyleDeclaration` 相关 API 用的较少

::: warning 用 style.cssText 进行完全的重写

想要以字符串的形式设置完整的样式，可以使用特殊属性 `style.cssText`：

```js
// 我们可以在这里设置特殊的样式标记，例如 "important"
div.style.cssText = `color: red !important;
    background-color: yellow;
    width: 100px;
    text-align: center;
  `;
```

可以通过设置一个特性（attribute）来实现同样的效果：`div.setAttribute('style', 'color: red...')`。

:::

### getComputedStyle 方法

```js
/**
 *
 * @param {Element} element 需要被读取样式值的元素。
 * @param {string} pseudo 伪元素（如果需要），例如 ::before。空字符串或无参数则意味着元素本身。
 * @returns {CSSStyleDeclaration} 只读对象
 */
getComputedStyle(element, [pseudo]);
```

::: warning 注意点

1. 返回的是解析值，也就是最后的单位都是固定的，如 `px`。[计算值和解析值](https://zh.javascript.info/styles-and-classes#ji-suan-yang-shi-getcomputedstyle)

2. 访问返回对象的样式时最好使用完整的属性：

   ```js
   let style = getComputedStyle(document.body);

   alert(style.margin); // 在 Firefox 中是空字符串
   alert(style.marginLeft); // 这样访问最佳
   ```

3. 在许多在线的演示代码中，`getComputedStyle`是通过 `document.defaultView` 对象来调用的。大部分情况下，这是不需要的。在 firefox3.6 上访问子框架内的样式才需要如此

:::
