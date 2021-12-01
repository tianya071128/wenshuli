---
title: DOM
date: 2021-10-21 15:00:00
permalink: /js/DOM
categories:
  - 前端
  - JS
tags:
  - null
---

# DOM

DOM（文档对象模型，Document Object Model）是 HTML 和  XML 文档的编程接口，DOM 表示由多层节点构成的文档，通过它开发者可以添加、删除和修改页面的各个部分。脱胎于网景和微软早期的动 HTML（DHTML，Dynamic HTML），**DOM 现在是真正跨平台、语言无关的表示和操作网页的方式。**

开始的时候，JS 和 DOM 是交织在一起的，但是最终演变成了两个独立的实体。JS 通过 DOM  提供的 API，可以用来访问和操作页面。因此我们可以写成这个近似的等式：

**API (web 或 XML 页面) = DOM + JS (脚本语言)**

DOM 被设计成与特定编程语言相独立，使文档的结构化表述可以通过单一，一致的API获得。在其他语言中也可以访问和操作 DOM，例如 Python：

```python
# Python DOM example
import xml.dom.minidom as m
doc = m.parse("C:\\Projects\\Py\\chap1.xml");
doc.nodeName # DOM property of document object;
p_list = doc.getElementsByTagName("para");
```

::: warning 注意

IE8 及更低版本中的DOM是通过COM 对象实现的。这意味着这些版本的IE 中，DOM 对象跟原生JavaScript 对象具有不同的行为和功能。

:::

## DOM 的演进

DOM Level 1 在1998 年成为W3C 推荐标准，主要定义了HTML 和XML 文档的底层结构。DOM2（DOM Level 2）和 DOM3（DOM Level 3）在这些结构之上加入更多交互能力

实际上，DOM2 和 DOM3 是按照模块化的思路来制定标准的，每个模块之间有一定关联，但分别针对某个 DOM 子集。

* DOM Core：在DOM1 核心部分的基础上，为节点增加方法和属性。
* DOM Views(视图)：定义基于样式信息的不同视图。
* DOM Events(事件）：定义通过事件实现DOM文档交互。
* DOM Style(样式)：定义以编程方式访问和修改CSS 样式的接口。
* DOM Traversal and Range(遍历)：新增遍历DOM文档及选择文档内容的接口。
* DOM HTML：在DOM1 HTML 部分的基础上，增加属性、方法和新接口。
* DOM Mutation Observers：定义基于DOM变化触发回调的接口。这个模块是DOM4 级模块，
  用于取代Mutation Events。

DOM3 还有XPath 模块和Load and Save 模块，一般不常用

::: tip 提示

尽管 DOM API 已经比较完善，

:::

## 节点层级

任何HTML 或XML 文档都可以用DOM表示为一个由节点构成的层级结构。节点分很多类型，每种类型对应着文档中不同的信息和（或）标记，也都有自己不同的特性、数据和方法，而且与其他类型有某种关系。**这些关系构成了层级，让标记可以表示为一个以特定节点为根的树形结构。**

HTML 的每段标记（元素、属性、注释等）都可以表示为 DOM 树的一个节点。DOM 中总共有 12 种节点类型，这些类型都继承一种基本类型（Node 类型）。

::: warning 注意

虽然节点类型有很多种，但浏览器并不支持所有节点类型。开发者最常用到的是元素节点和文本节点。

:::

### 1. Node 类型

Node 类型是其他节点类型的基类，所有节点类型都继承了 Node 类型，因此所有类型都共享相同的基本属性和方法 。

* 属性：

  * nodeType：表示节点的类型
  * nodeName：如果是元素节点而言，表示元素的标签名
  * nodeValue：如果是元素节点，则为 null。

* 方法：

  多为节点操作方法，[MDN-Node 接口](https://developer.mozilla.org/zh-CN/docs/Web/API/Node)

### 2. Document 类型

Document 表示文档节点类型，在浏览器中，文档对象 document 是 HTMLDocument 的实例(HTMLDocument 继承Document)，表示整个 HTML 页面

Document 类型继承图：

![image-20211201171629229](/img/58.png)

document 对象的继承图：

![image-20211201172139769](/img/59.png)

如上图所示，document 对象不止继承了 Document 类型，还通过 HTMLDcument 类型扩展了属性和方法，[具体属性和方法参考MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Document)

### 3. Element 类型

Element 类型表示 XML 或 HTML 元素，对外暴露出元素的签名、子节点和属性的能力。

**所有的  HTML 元素都是 HTMLElement(继承至 Element 类型) 类型或子类型的实例，具体可见[MDN-HTML 接口](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model#html_%E6%8E%A5%E5%8F%A3)**

继承关系如下图：

![image-20211201194019406](/img/60.png)

### 4. Text 类型

Text 类型表示文档中的文本，包含按字面解释的纯文本，也可能包含转义后的HTML 字符，但不含HTML 代码

### 5. Comment 类型

Comment 类型表示文档的注释

![image-20211201194844354](/img/61.png)

### 6. CDATASection 类型

CDATASection 类型表示XML 中特有的CDATA 区块。CDATA 区块只在XML 文档中有效。

### 7. DocumentType 类型

DocumentType 类型的节点包含文档的文档类型（doctype）信息

### 8. DocumentFragment 类型

DocumentFragment 类型表示文档片段。**在所有的节点类型中，只有 DocumentFragment 在文档(DOM树)中没有对应的标记，也就是说，DocumentFragment 类型创建的节点不属于 DOM 树的一部分，不会渲染到页面上。**

通常我们通过 DocumentFragment 节点来操作节点，不会像操作 DOM 树一样占用性能。

在把文档片段添加到文档（DOM树）时，这个文档片段的所有子节点会被添加到文档中相应的位置。**但是文档片段本身永远不会被添加到文档树。**

```js
let fragment = document.createDocumentFragment();
let ul = document.getElementById("myList");
for (let i = 0; i < 3; ++i) {
	let li = document.createElement("li");
	li.appendChild(document.createTextNode(`Item ${i + 1}`));
	fragment.appendChild(li);
}
ul.appendChild(fragment);
```

### 9. Attr 类型

Attr 类型表示元素的特性，技术上讲，特性就是存在于元素 attributes  属性中的节点。

属性节点尽管是节点，却不被认为是DOM 文档树的一部分。虽然存在一些操作方法，但不推荐使用这些方法进行属性的操作

### 其他

所有的 DOM 接口可以在[MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model)上找到

## 参考

* [MDN-DOM概述](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model/Introduction)

