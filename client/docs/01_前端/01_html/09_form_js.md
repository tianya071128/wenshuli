---
# 页面 title, 同时也是 侧边栏 title
title: js 表单操作
date: 2021-10-21 17:00:00
# 永久链接, 不与页面目录路径
permalink: /html/formJS
categories: 
  - 前端
  - HTML
tags: 
  - null
---
# js 操作

## 光标操作

**DOM中并没有直接获取光标位置的方法，那么我们只能间接来获取光标位置。DOM支持获取光标选中的范围，我们可以以此为切入点，来获取或定位光标的位置。当选取范围起始点和结束点一样时，就是光标插入的位置。**

`input/textarea` 控件存在以下属性和方法：

* `selectionDirection`:forward | backward | none,选区方向
* `selectionEnd`: 选区终点位置
* `selectionStart`: 选区起点位置
* `setSelectionRange(selectionStart, selectionEnd, [selectionDirection])`:设置获取焦点的输入性元素的选区范围。

### 获取光标位置

::: tip 测试

<html-test type="getCursor" />

:::

```js
// dom：表单控件 -- 前提条件最好是表单控件是获取了焦点的
function getCursorPos(dom) {
  if (dom instanceof HTMLInputElement || dom instanceof HTMLTextAreaElement) {
    dom.focus(); // 先让元素获取焦点
    let pos = 0;
    if ('selectionStart' in dom) { // IE8- 不支持
      pos = dom.selectionStart; // 获取光标开始的位置
    } else if ('selection' in document) { // 兼容 IE
      const selectRange = document.selection.createRange(); // 创建范围
      selectRange.moveStart('character', -dom.value.length); 
      pos = selectRange.text.length;          
    }
    return pos;
 } else {
   throw new Error('参数错误或输入框没有获取焦点')
 }
}
```

### 设置光标位置

::: tip 测试

<html-test type="setCursor" />

:::

```js
/**
 * 设置光标位置
 * @params {DOM} dom 输入框控件
 * @params {Number} pos 需要设置光标位置
 */
function setCursorPos(dom, pos) {
  if (dom instanceof HTMLInputElement || dom instanceof HTMLTextAreaElement) {
    dom.focus(); // 获取焦点
    if (dom.setSelectionRange) { // IE8- 不支持
      dom.setSelectionRange(pos, pos); // 设置文本选区，当位置一致时，则变相设置了光标位置
    } else if (dom.createTextRange) {
      const range = dom.createTextRange; // 创建文本范围
      range.collapse(true);
      range.moveEnd("character", pos);
      range.moveStart("character", pos);
      range.select();
    }
  } else {
    throw new TypeError("no");
  }
}
```

## 文本操作

`input/textarea` 控件存在以下属性和方法：

* `selectionDirection`:forward | backward | none,选区方向
* `selectionEnd`: 选区终点位置
* `selectionStart`: 选区起点位置
* `setSelectionRange(selectionStart, selectionEnd, [selectionDirection])`:设置获取焦点的输入性元素的选区范围。
* `select()`：用于选择框中的所有文本 -- 在大多数浏览器中都会将焦点设置到文本框中。

还支持以下事件：`select`，在选择了文本框的文本触发。

在 IE8- 版本浏览器中，只要用户选择了一个字母（不必释放鼠标，就会触发 select 事件。其他浏览器中，只有用户选择了文本(而且要释放鼠标)才会触发。

调用 select() 方法也会触发 select 事件

### 获取焦点时选择全部文本

**调用 select() 方法时会选择全部文本**

::: tip 测试

<html-test type="selectAllText" />

:::

```js
InputDOM.addEventListener('focus', (e) => {
  e.target.select();
})
```

### 取得用户选择的文本

**监听 select 事件，利用 selectionStart和 selectionEnd 获取到取得的文本**

::: tip 测试

<html-test type="selectPartText" />

:::

```js
/**
 * 设置光标位置
 * @params {DOM} dom 输入框控件
 * @returns {String} 选择的文本
 */
function getSelectText(dom) {
  if (typeof dom.selectionStart === "number") {
    // IE8- 不支持
    return dom.value.substring(dom.selectionStart, dom.selectionEnd);
  } else if (document.selection) {
    // 兼容 IE8-	
    return document.selection.createRange().text;
  }
}
```

### 设置选择部分文本

**使用 setSelectionRange(selectionStart, selectionEnd, [selectionDirection]) 方法设置文本选择。要想看到效果，需要在调用之前或之后获取焦点**

::: tip 测试

<html-test type="setPartText" />

:::

```js
function setSelectPartText(dom, startIndex, endIndex) {
  dom.focus(); // 要想看到效果，需要获取焦点
  if (dom.setSelectionRange) {
    dom.setSelectionRange(startIndex, endIndex);
  } else if (dom.createTextRange) {
    const range = dom.createTextRange; // 创建文本范围
    range.collapse(true);
    range.moveEnd("character", startIndex);
    range.moveStart("character", endIndex - startIndex);
    range.select();
  }
}
```

## 过滤输入

我们可以结合 `input` 事件过滤输入：

* input 事件在输入中文时，开始新的输入合成过程中也会触发。 => 也就是输入字母还没有确定中文时会持续触发
* 所以需要结合 `compositionstart` 和 `compositionend` 事件来区分。
* 复制粘贴都会触发 `input` 事件，但是直接通过 DOM 修改 value 时不会触发。
* IE9 也存在兼容性问题，见以下代码处理兼容性
* **使用 input 事件过滤还存在一个问题：当过滤不符合字符时，可以达到过滤的效果，但光标会跳转到末尾。此时可以结合光标操作设置光标**

打开这个 <a href="/html/05.html?test=tabindex" target="_blank">HTML</a> 试试

```js
/** ============ 以下行为参考 vue 的 input 事件行为 - 解决 input 事件问题 =============== */
/** ============ 注意：在 vue 框架中，以下行为 vue 框架内部处理。 =============== */
const el = document.getElementById("myInput");
const UA = window.navigator.userAgent.toLowerCase();
const isIE9 = UA && UA.indexOf("msie 9.0") > 0;

function onCompositionStart(e) {
  // 提供一个标识
  e.target.composing = true;
}

function onCompositionEnd(e) {
  // prevent triggering an input event for no reason 防止无故触发输入事件
  if (!e.target.composing) return;
  e.target.composing = false;
  // 为什么需要手动触发一次？ 因为 input 事件比 compositionend 事件优先级更高，在 compositionend 事件触发时 input 事件已经触发完毕了，但是 composing 还没有置为 false
  trigger(e.target, "input");
}

// 手动触发 input 事件
function trigger(el, type) {
  const e = document.createEvent("HTMLEvents");
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

el.addEventListener("compositionstart", onCompositionStart);
el.addEventListener("compositionend", onCompositionEnd);
// Safari < 10.2 & UIWebView doesn't fire compositionend when
// switching focus before confirming composition choice
// this also fixes the issue where some browsers e.g. iOS Chrome
// fires "change" instead of "input" on autocomplete.
el.addEventListener("change", onCompositionEnd);

// 处理 IE9 中 input 事件兼容性
if (isIE9) {
  // http://www.matts411.com/post/internet-explorer-9-oninput/
  document.addEventListener("selectionchange", () => {
    const el = document.activeElement;
    if (el && el.vmodel) {
      trigger(el, "input");
    }
  });
  el.vmodel = true;
}

/** ============ end =============== */

// 最主要的是在 input 事件中过滤输入
el.addEventListener("input", (e) => {
  if (e.target.composing) return; // 文本复合过程中不参与

  // 在这里格式化内容
  formatter(e.target);
});

function formatter(textBox) {
  textBox.value = (textBox.value || "").replace(/[^\d]/g, "");
}
```

在 js 高程中过滤输入是通过 keypress 事件，但是输入中文是复合输入的，此时不会触发 keypress 事件。

## 参考

* [CSDN-js获取光标位置](https://blog.csdn.net/mafan121/article/details/78519348)

* 书籍（JS 高程 14.2-文本框脚本）

