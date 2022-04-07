---
title: css 基础概念
date: 2021-10-21 15:00:00
permalink: /css/
categories: -- css
  -- css
tags:
  - null
---

# css

**层叠样式表** (Cascading Style Sheets，缩写为 **CSS**），是一种 [样式表](https://developer.mozilla.org/zh-CN/docs/Web/API/StyleSheet) 语言，用来描述 [HTML](https://developer.mozilla.org/zh-CN/docs/Web/HTML) 或 [XML](https://developer.mozilla.org/zh-CN/docs/Web/XML/XML_Introduction)（包括如 [SVG](https://developer.mozilla.org/zh-CN/docs/Web/SVG)、[MathML](https://developer.mozilla.org/zh-CN/docs/Web/MathML)、[XHTML](https://developer.mozilla.org/zh-CN/docs/Glossary/XHTML) 之类的 XML 分支语言）文档的呈现。CSS 描述了在屏幕、纸质、音频等其它媒体上的元素应该如何被渲染的问题。

## css 模块

CSS 被分为不同等级：CSS1 现已废弃， CSS2.1 是推荐标准， CSS3 分成多个小模块且正在标准化中。

从 CSS3 开始，CSS 就被分成多个小模块分别进行标准化，更新。严格来说，并没有 CSS3 这种统称，只是对 CSS 模块的等级分类，例如：

- CSS Fonts Module Level 4：字体模块已经更新到 Level4;
- CSS Transforms Module Level 1：过渡模块也才到 Level1;
- 在这里可查看所有 [CSS 模块](https://www.w3.org/Style/CSS/current-work)，更好的是查看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS)

**模块化将 CSS 分解为更易于管理的块，并允许对 CSS 进行更直接的增量改进。**

## css 语法

CSS 主要由以下两个部分构建：

- 属性（ **property）**是一个标识符，用可读的名称来表示其特性。
- 值（**value）**则描述了浏览器引擎如何处理该特性。每个属性都包含一个有效值的集合，它有正式的语法和语义定义，被浏览器引擎实现。

以下的语法依次组成：

### CSS 声明

一个属性与值的键值对被称为”声明“（declaration）

![image-20220407094329018](/img/82.png)

### CSS 声明块

声明会按照**块**的形式被组合。声明块可能为空，也就是包含空的声明。

![image-20220407100019560](/img/83.png)

### CSS 规则

一对选择器与声明块称为规则集（ruleset)，常简称为规则（rule)。

![image-20220407100951806](/img/84.png)

### CSS 语句

规则是样式表的主体，通常样式表会包括大量的规则列表。但有时候网页的作者也希望在样式表中包括其他的一些信息，比如字符集，导入其它的外部样式表，字体等，这些需要专门的语句表示。

语句类型：

- 规则。如上，将一组 CSS 声明与用选择器定义的条件相关联。
- at 规则（[at-rules](https://developer.mozilla.org/en/CSS/At-rule)）。以@ (U+0040 COMMERCIAL AT) 开始，随后是标识符，一直到以分号或右大括号结束。每个 at 规则由其标识符定义，可能有它自己的语法。at 规则涵盖了 meta 信息（比如 @charset @import)，条件信息（比如@media @document), 描述信息（比如@font-face)。

![image-20220407101707961](/img/85.png)

## 当浏览器遇到无法解析的 CSS 代码会发生什么

**如果一个浏览器在解析你所书写的 CSS 规则的过程中遇到了无法理解的属性或者值，它会忽略这些并继续解析下面的 CSS 声明。在你书写了错误的 CSS 代码（或者误拼写），又或者当浏览器遇到对于它来说很新的还没有支持的 CSS 代码的时候上述的情况同样会发生（直接忽略）**

这一特点在你想使用一个很新的 CSS 特性但是不是所有浏览器都支持的时候（浏览器兼容）非常有用：

```css
.box {
  width: 500px;
  // 当支持 calc 语法时，就会运用，不支持的话，直接忽略
  width: calc(100% - 50px);
}
```

## css 兼容性

浏览器并不会同时实现所有的新 CSS，此外很多人也不会使用最新版本的浏览器。也就存在 CSS 兼容性的问题。

可以查看 [MDN-支持旧浏览器](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/CSS_layout/Supporting_Older_Browsers)，此外，更多的是 `postcss` 的 `autoprefixer` 等工具进行 css 构建解决 css 兼容性问题

## 参考

- [MDN-CSS](https://developer.mozilla.org/zh-CN/docs/Web/CSS)
- [w3c-css](https://www.w3.org/Style/CSS/)
