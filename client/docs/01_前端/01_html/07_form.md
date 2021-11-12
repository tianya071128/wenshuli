---
# 页面 title, 同时也是 侧边栏 title
title: 表单元素
date: 2021-10-21 17:00:00
# 永久链接, 不与页面目录路径
permalink: /html/form
categories: 
  - 前端
  - HTML
tags: 
  - null
---

# 表单元素

## form 元素

form 元素是创建一个表单的开始，所有表单元素应该包含在 form 元素中。

::: warning 注意

最好不要嵌套表单，否则表单的行为不可预知。

HTML5在HTML表单元素中引入`form`属性。它让您显式地将元素与表单绑定在一起，即使元素不在[``](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/form)中。不幸的是，就目前而言，跨浏览器对这个特性的实现还不足以使用。

:::

### form 元素属性

* name：表单名称。可用来通过`document.forms` 访问该表单

  ```js
  document.forms["myForm"] // 表单 DOM
  ```

* accept-charset：规定服务器可处理的表单数据字符集。

* autocomplete：用于指示 input 元素是否能够拥有一个默认值，此默认值是由浏览器自动补全的。

  [参考-菜鸟教程](https://www.runoob.com/tags/att-form-autocomplete.html)

**下列属性控制提交表单的行为，并且会被按钮的属性重写。**

* action：表单提交的 URL。

* enctpe：表单提交数据之前如何对其进行编码。（适用于 method="post" 的情况）

  * application/x-www-form-urlencoded（默认值）
  * multipart/form-data（上传文件时需设置）
  * text/plain

* method：表单提交时的 HTTP 方法。目前只支持 GET、POST。

* novalidate：表单提交时不进行验证。

* target：表单提交时规定在何处打开 action URL。

  * _blank：在新的未命名的浏览上下文中加载。
  * _self：默认值。在相同浏览上下文中加载。
  * _parent： 在当前上下文的父级浏览上下文中加载，如果没有父级，则与 _self 表现一致。
  * _top：在最顶级的浏览上下文中（即当前上下文的一个没有父级的祖先浏览上下文），如果没有父级，则与 _self 表现一致。

## 通用属性

下面这些属性适用于所有表单控件，可以对其进行控制。

| 属性名称  | 描述                                                         |
| --------- | ------------------------------------------------------------ |
| autofocus | 是否自动获取焦点                                             |
| disabled  | 是否禁用。可能从父元素中继承设置，例如: fieldset；=> 禁用后，通过 form 元素获取不到此控件的值 |
| form      | 与之关联的表单的 ID。理论上可以在 form 元素之外定义一个表单元素，但浏览器暂不支持 |
| name      | 表单数据 key 值                                              |
| value     | 表单的初始值                                                 |

## 文本输入框 `<input>`

`input` 是最基本的表单控件，可以通过不同 `type` 来让用户输入不同的数据。

所有文本框除了通用属性，还具有如下属性：

| 属性        | 描述                                               |
| ----------- | -------------------------------------------------- |
| readonly    | 用户不能修改值 => 可以通过 form 元素获取此控件的值 |
| placeholder | 占位符                                             |
| size        | 规定以字符数计的 `<input>` 元素的可见宽度。        |
| maxlength   | 允许的最大字符数。                                 |

### 单行文本框：text

 `type` 为 `text` 的 `input`，创建一个单行文本框。`intpu` 默认值就是 `text`，并且在 `type` 为浏览器不支持的时候，也会是 `text`。

<input type="text" id="comment" name="comment" value="单行文本框">

单行文本框：

* 单行文本框只有一个真正的约束：如果您输入带有换行符的文本，浏览器会在发送数据之前删除这些换行符。也就是说，单行文本框是不会换行的	

### 密码框：password

type：password，创建一个密码框。

<input type="password" id="pwd" name="pwd">

使用密码框：

* 数据还是明文的，这只是一个界面特性，无法直接看到数据
* 地址栏右边有一个钥匙图标，可以保存其输入的账号密码。 => 当存在多个时，可以进行选择

### 单选框：radio

type：radio，创建单选框。通过设置一样的 name 属性分为一组。同一组中只能选中一个项。

<ul>
    <li>
      <label for="soup">Soup</label>
      <input type="radio" checked id="soup" name="meal" value="soup">
    </li>
    <li>
      <label for="curry">Curry</label>
      <input type="radio" id="curry" name="meal" value="curry">
    </li>
    <li>
      <label for="pizza">Pizza</label>
      <input type="radio" id="pizza" name="meal" value="pizza">
    </li>
  </ul>

单选框：

* 设置 checked 属性的单选框为默认选中项
* 控件的 value 属性就是提交值

### 复选框：checkbox

type：checkbox，创建复选框。与单选框的区别在于可以多选，同样根据 name 进行分组。

<label><input type="checkbox" name="vehicle" value="Bike"> 我有一辆自行车</label><br><label><input type="checkbox" name="vehicle" value="Car"> 我有一辆小轿车</label><br><label><input type="checkbox" name="vehicle" value="Boat"> 我有一艘船</label><br>

复选框：

* 设置 checked 属性的单选框为默认选中项
* 控件的 value 属性就是提交值

### 文件选择框：file

type：file，创建文件选择框。

```html
<input type="file" name="file" id="file" accept="image/*" multiple>
```

<input type="file" name="file" id="file" accept="image/*" multiple>

文件选择框：

* accept：可以设置被接受的文件类型。不验证所选文件的类型；它只是为浏览器提供提示来引导用户选择正确的文件类型。[MDN-参考](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/Input/file#%E5%94%AF%E4%B8%80%E6%96%87%E4%BB%B6%E7%B1%BB%E5%9E%8B%E8%AF%B4%E6%98%8E%E7%AC%A6)
* multiple：允许选择多个文件。
* 通过 `HTMLInputElement.files` 可以获取选择的文件对象。

### 按钮框

以下有几种按钮框（**一般主要用 button 元素实现按钮**）：

* submit：提交按钮，将表单数据提交到服务器
* reset：重置按钮，将表单数据重置为默认值
* button：可点击按钮，没有默认行为，主要与 js 脚本配合使用
* image：图像按钮，与 submit 行为一致，主要是以图像为按钮

### 其他小控件

[菜鸟教程](https://www.runoob.com/tags/att-input-type.html)

例如 number、month、email 等等作用不是很大，在移动端可以通过 type：number 等让键盘默认为数字。

## 多行文本框 `textarea`

textarea 与 input:text(单行文本框)的主要区别是，允许用户输入包含硬换行符(即按回车)的文本。

支持的其他属性：

| 属性                                                         | 默认值 | 描述                                                 |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------- |
| [`cols`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/textarea#attr-cols) | `20`   | 文本控件的可见宽度，平均字符宽度。                   |
| [`rows`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/textarea#attr-rows) |        | 控制的可见文本行数。                                 |
| [`wrap`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/textarea#attr-wrap) | `soft` | 表示控件是如何包装文本的。可能的值：`hard` 或 `soft` |

::: warning 注意

1. textarea 只接受文本内容，所以将任何HTML内容放入 textarea 中都呈现为纯文本内容。
2. textarea 不支持 value 属性，只需要将默认的文本放在元素开始和结束标记之间。
3. 在大多数浏览器，会在右下角有一个拖放操作，可用 CSS 设置 resize: none 来关闭。
4. textarea 并不会自适应高度，此时我们需要结合 js 来设置高度。

:::

## 下拉选择框：`select`、`option`、`optgroup`

选择框由 `select` 元素创建的，通过 `option` 元素定义选项，通过 `optgrou` 定义其分组

<select id="groups" name="groups" multiple>
  <optgroup label="fruits">
    <option>Banana</option>
    <option selected>Cherry</option>
    <option>Lemon</option>
  </optgroup>
  <optgroup label="vegetables">
    <option>Carrot</option>
    <option>Eggplant</option>
    <option>Potato</option>
  </optgroup>
</select>

注意：

* select 元素的 multiple 属性：支持多选(同时按下 Cmd/Ctrl 并点击多个值)
* option 元素的 selected 属性：设置选择项默认值（如果没有设置的选项，默认为第一个）
* option 元素的 value 属性：表单提交时的值，默认为元素标记之间内容值。
* optgroup 元素的 disabled 属性：可以设置一组是否禁用。
* **当为多选时，select 的 value 值不是选中的全部值，此时应该遍历 option 选项，通过 option 的 selected 属性来判断时是否选中**

## 按钮：`button`

与 [`input` 按钮框](#按钮框)类似，有三种类型。

type：submit、reset、submit 三种类型。

可以重写 `form` 元素的表单提交属性，[form 属性](#form-元素属性)

## 其他元素

### `<label>`：标注 `input` 元素

主要有以下优点：

- 标签文本不仅与其相应的文本输入元素在视觉上相关联，程序中也是如此。 这意味着，当用户聚焦到这个表单输入元素时，屏幕阅读器可以读出标签，让使用辅助技术的用户更容易理解应输入什么数据。
- 你可以点击关联的标签来聚焦或者激活这个输入元素，就像直接点击输入元素一样。这扩大了元素的可点击区域，让包括使用触屏设备在内的用户更容易激活这个元素。

有两种标注方式：

1. 通过 `for` 属性绑定到 `input` 元素。`for` 绑定的是 `input` 元素的 `id`。
2. `label` 元素包含 `input` 元素

::: warning 注意

* 一个 input 可以与多个标签相关联。
* 点击或者轻触（tap）与表单控件相关联的 `<label>` 也可以触发关联控件的 `click` 事件。
* **通常可利用这个特性来定制化表单控件**

:::

### other

[菜鸟教程-元素参考](https://www.runoob.com/tags/ref-byfunc.html)

## 参考

[MDN](https://developer.mozilla.org/zh-CN/docs/Learn/Forms/Basic_native_form_controls)

[菜鸟](https://www.runoob.com/tags/ref-byfunc.html)

