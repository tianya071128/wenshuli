---
title: SassScript
date: 2021-10-21 15:00:00
permalink: /Sass/SassScript
categories: -- 工程化
  -- Sass
tags:
  - null
---

# SassScript

SassScript 类似于 JS 脚本，可以做一些脚本处理，可作用于任何属性，允许属性使用变量、算数运算等额外功能。

## 变量

Sass 变量很简单：将一个值赋给以\$开头的名称，然后可以引用该名称，而不是值本身。

语法为：`<variable>: <expression>`，**变量可以在您想要的任何地方声明**

:::: tabs :options="{ useUrlFragment: false }"
::: tab Sass

```scss
$base-color: #c6538c;
$border-dark: rgba($base-color, 0.88);

.alert {
  border: 1px solid $border-dark;
}
```

:::
::: tab css

```css
.alert {
  border: 1px solid rgba(198, 83, 140, 0.88);
}
```

:::
::::

::: warning 注意

**Sass 变量与所有 Sass 标识符一样，将连字符和下划线视为相同。**这意味着`$font-size 和 $font_size`都指的是同一个变量。这是 Sass 早期的历史遗留问题

:::

### Sass 变量和 css 变量的区别

与 css 变量完全不同：

- Sass 变量最终都会被 Sass 编译。而 CSS 变量包含在 CSS 输出

- CSS 变量对于不同的元素可以有不同的值，但 Sass 变量一次只有一个值。

- **Sass 变量是*命令式*的，这意味着如果你使用一个变量然后改变它的值，之前的使用将保持不变**。CSS 变量是*声明性*的，这意味着如果您更改值，它将影响早期使用和后期使用。

  :::: tabs :options="{ useUrlFragment: false }"
  ::: tab Scss

  ```scss
  $variable: value 1;
  .rule-1 {
    value: $variable;
  }
  
  $variable: value 2;
  .rule-2 {
    value: $variable;
  }
  ```

  :::
  ::: tab css

  ```css
  .rule-1 {
    value: value 1;
  }
  
  .rule-2 {
    value: value 2;
  }
  ```

  :::
  ::::

### 作用域

变量支持块级作用域，嵌套规则内定义的变量只能在嵌套规则内使用（局部变量），不在嵌套规则内定义的变量则可在任何地方使用（全局变量）。

:::: tabs :options="{ useUrlFragment: false }"
::: tab Scss

```scss
$global-variable: global value;

.content {
  $local-variable: local value;
  global: $global-variable;
  // 块级作用域变量只能在这里使用
  local: $local-variable;
}

.sidebar {
  global: $global-variable;

  // 这将失败，因为$local变量不在作用域内:
  // local: $local-variable;
}
```

:::
::: tab css

```css
.content {
  global: global value;
  local: local value;
}

.sidebar {
  global: global value;
}
```

:::
::::

### !global 标志：局部变量转换为全局变量

将局部变量转换为全局变量可以添加 `!global` 声明：

:::: tabs :options="{ useUrlFragment: false }"
::: tab Scss

```scss
#main {
  $width: 5em !global;
  width: $width;
}

#sidebar {
  width: $width;
}
```

:::
::: tab css

```css
#main {
  width: 5em;
}

#sidebar {
  width: 5em;
}
```

:::
::::

### !default：设置默认值

可以在变量的结尾添加 `!default` 给一个未通过 `!default` 声明赋值的变量赋值，此时，如果变量已经被赋值，不会再被重新赋值，但是如果变量还没有被赋值(变量是 null 空值时将视为未被 `!default` 赋值)，则会被赋予新的值。

:::: tabs :options="{ useUrlFragment: false }"
::: tab Scss
```scss
$content: 'First content';
$content: 'Second content?' !default;
$new_content: null;
$new_content: 'First time reference' !default;

#main {
  content: $content;
  new-content: $new_content;
}
```
::: 
::: tab css
```css
#main {
  content: "First content";
  new-content: "First time reference";
}
```
:::
::::

## 插值语句

插值语句  `#{}` 几乎可以在 Sass 样式表中的任何地方使用，以将 [SassScript 表达式](https://sass-lang.com/documentation/syntax/structure#expressions) 的结果嵌入到 CSS 块中。

* 选择器：

  :::: tabs :options="{ useUrlFragment: false }"
  ::: tab Scss
  ```scss
  $name: foo;
  
  p.#{$name} {
    border-color: blue;
  }
  ```
  ::: 
  ::: tab css
  ```css
  p.foo {
    border-color: blue;
  }
  ```
  :::
  ::::

* CSS 属性名和属性值：

  :::: tabs :options="{ useUrlFragment: false }"
  ::: tab Scss
  ```scss
  $attr: border;
  p {
    #{$attr}-color: blue;
  }
  ```
  ::: 
  ::: tab css
  ```css
  p {
    border-color: blue;
  }
  ```
  :::
  ::::

* CSS 变量(自定义属性值)：

  :::: tabs :options="{ useUrlFragment: false }"
  ::: tab Scss
  ```scss
  $warn: #dfa612;
  
  :root {
    --warn: #{$warn};
  
    // 虽然这看起来像一个Sass变量，但它是有效的CSS，所以它不会被编译
    --consumed-by-js: $primary;
  }
  ```
  ::: 
  ::: tab css
  ```css
  :root {
    --warn: #dfa612;
    --consumed-by-js: $primary;
  }
  ```
  :::
  ::::

* [CSS 规则](https://sass-lang.com/documentation/at-rules/css)

* [`@extend`s](https://sass-lang.com/documentation/at-rules/extend)

* [纯CSS `@import` _](https://sass-lang.com/documentation/at-rules/import#plain-css-imports)

* [带引号或不带引号的字符串](https://sass-lang.com/documentation/values/strings)

* [特殊功能](https://sass-lang.com/documentation/syntax/special-functions)

* [纯CSS函数名称](https://sass-lang.com/documentation/at-rules/function#plain-css-functions)

* [注释](https://sass-lang.com/documentation/syntax/comments)

## 数据(值)类型

Sass 支持许多值类型，其中大部分直接来自 CSS。每个[表达式](https://sass-lang.com/documentation/syntax/structure#expressions)产生一个值，[变量](https://sass-lang.com/documentation/variables)保存值。

大多数值类型直接来自 CSS：

- 数字：可能有也可能没有单位，比如`12` 或 `100px`。
- 字符串：可能有也可能没有引号，比如 `"Helvetica Neue"` 或  bold。
- 颜色：可以通过其十六进制表示或名称来引用，例如`#c6538c`或 `blue`，或者从函数返回，例如`rgb(107, 113, 127)`或 `hsl(210, 100%, 20%)`。
- 值列表(数组)：可以用空格或逗号分隔，可以用方括号括起来，也可以根本没有括号，如`1.5em 1em 0 2em`,`Helvetica, Arial, sans-serif` 或 `[col1-start]`。

还有一些是特定于 Sass 的：

* 布尔：`true` 和 `false`
* 单例：`null`
* maps：相当于 `JavaScript` 的 `object`，将值与键相关联的映射，例如 `("background": red, "foreground": pink)`

::: warning 注意

SassScript 也支持其他 CSS 属性值，比如 Unicode 字符集，或 `!important` 声明。然而Sass 不会特殊对待这些属性值，一律视为无引号字符串。

:::

### 数字(number)

Sass 中的数字有两个部分组成：数字本身及其单位。数字可以没有单位，也可以有复杂的单位。例如 `16px` 中，`16` 是数字，`px` 是单位

```scss
@debug 100; // 100
@debug 0.8; // 0.8 -- 支持小数位
@debug 16px; // 16px -- 有单位数字
@debug 5.2e3; // 5200 -- 支持科学计数法
```

### 字符串(string)

支持两种字符串类型，内部结构相同但呈现方式不同：

* 有引号字符串，如 `"Lucida Grande"` `'http://sass-lang.com'`；
* 无引号字符串，如 `sans-serif` `bold`；

这两种字符串在编译成 CSS 文件时不会改变其类型，只有一种情况例如，使用 `#{}` (interpolation) 时，有引号字符串将被编译为无引号字符串

```scss
@use "sass:meta";
$roboto-variant: "Mono";
@debug "Roboto #{$roboto-variant}"; // "Roboto Mono"

// 此时可以使用 meta.inspect 方法保留引号
@debug 'Roboto #{meta.inspect($roboto-variant)}'; // Roboto "Mono"
```

### 颜色(color)

Sass 颜色可以写成多种形式，最终会被编译成 CSS 支持的颜色类型(十六进制或 `rgba()`等)：

* 十六进制代码（`#f2ece4`或 `#b37399aa`）；
* CSS[颜色名称](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords)（`midnightblue`、`transparent`）；
* 函数  [`rgb()`](https://sass-lang.com/documentation/modules#rgb), [`rgba()`](https://sass-lang.com/documentation/modules#rgba), [`hsl()`](https://sass-lang.com/documentation/modules#hsl), 和 [`hsla()`](https://sass-lang.com/documentation/modules#hsla)

```scss
@debug #f2ece4; // #f2ece4
@debug #b37399aa; // rgba(179, 115, 153, 0.6666666667)
@debug midnightblue; // midnightblue
@debug rgb(204, 102, 153); // rgb(204, 102, 153)
@debug rgba(107, 113, 127, 0.8); // rgba(107, 113, 127, 0.8)
@debug hsl(228, 7%, 86%); // hsl(228deg, 7%, 86%)
@debug hsla(20, 20%, 85%, 0.7); // hsla(20deg, 20%, 85%, 0.7)
```

::: warning 注意

编译结果与 sass 版本和 sass 配置以及 browserslist 相关

例如 css 已经支持 `hsl` 颜色函数，所以可以直接编译成 `hsl()`

例如在 Sass 压缩模式下，就会将 `hsl` 编译 `rgba()`

:::

### 布尔(true 和 false)

布尔值是逻辑值 true 和 false。除了文字形式(字面量形式)，还可以通过相等(==)和关系运算符以及内置函数返回

```scss
@use "sass:math";

@debug 1px == 2px; // false
@debug 1px == 1px; // true
@debug 10px < 3px; // false
@debug math.compatible(100px, 3in); // true
```

`false`和的值[`null`](https://sass-lang.com/documentation/values/null)是 *falsey*，这意味着 Sass 认为它们表示错误并导致条件失败。一些语言认为更多的值是 *falsey*，而不仅仅是`false`和`null`。Sass 不是其中一种语言！空字符串、空列表和数字`0`在 Sass 中都是真值。

 ### null

该值`null`是其类型的唯一值。它表示缺少值，并且通常由[函数](https://sass-lang.com/documentation/at-rules/function)返回以指示缺少结果。

```scss
@use "sass:string";

@debug string.index('Helvetica Neue', 'Roboto'); // null
@debug &; // null
```

当属性值中存在 `null` 时，此时可能是如下两种情况：

* 属性值列表中包含 `null`：则从生成的CSS中将`null`省略 ；
* 属性值为`null`，则完全省略该属性

:::: tabs :options="{ useUrlFragment: false }"
::: tab Scss
```scss
$fonts: ("serif": "Helvetica Neue", "monospace": "Consolas");

h3 {
  // 此时编译成 font: 18px bold;
  font: 18px bold map-get($fonts, 'sans');
  font: {
    size: 18px;
    weight: bold;
    // 这个属性会被忽略
    family: map-get($fonts, 'sans');
  }
}
```
::: 
::: tab css
```css
h3 {
  font: 18px bold;
  font-size: 18px;
  font-weight: bold;
}
```
:::
::::

### 数组(Lists)

在 Sass 中，可以使用多种方式定义数组，只要在列表中保持一致即可：

* 逗号：`Helvetica, Arial, sans-serif`;
* 空格：`10px 15px 0 0`；
* 方括号：`[line1 line2]`
* [斜线分隔](https://sass-lang.com/documentation/values/lists#slash-separated-lists)，有限制

::: warning 单元素数组和空数组

单元素数组可以写成`(<expression>,)`或`[<expression>]`，

空数组可以写成`()`或`[]`。

没有括号的空数组是无效的 CSS，因此Sass不允许在属性值中使用空数组。

:::

#### 使用数组

Sass 提供了一些[函数](https://sass-lang.com/documentation/modules/list)(`sass:list`)，用于操作数组

##### 索引

Sass 的数组的索引与一般语言的都不同，是从 `1` 开始的，表示第一个元素，并且还可以从末尾开始，索引 -1 指的是列表中的最后一个元素，-2 指的是倒数第二个，依此类推。

##### 访问元素

使用该[list.nth($list, $n)函数](https://sass-lang.com/documentation/modules/list#nth)获取列表中给定索引处的元素。

```scss
@use 'sass:list';

@debug list.nth(10px 12px 16px, 1); // 10px
@debug list.nth(10px 12px 16px, -2); // 12px
```

##### 遍历数组

使用 [@each规则](https://sass-lang.com/documentation/at-rules/control/each) 遍历元素

:::: tabs :options="{ useUrlFragment: false }"
::: tab Scss
```scss
$sizes: 40px, 50px, 80px;

@each $size in $sizes {
  .icon-#{$size} {
    font-size: $size;
    height: $size;
    width: $size;
  }
}
```
::: 
::: tab css
```css
.icon-40px {
  font-size: 40px;
  height: 40px;
  width: 40px;
}

.icon-50px {
  font-size: 50px;
  height: 50px;
  width: 50px;
}

.icon-80px {
  font-size: 80px;
  height: 80px;
  width: 80px;
}
```
:::
::::

#### 数组是不可变的

Sass 中的数组是*不可变*的，这意味着数组值的内容永远不会改变。Sass 的数组函数都返回新数组而不是修改原始数组。

```scss
@use 'sass:list';
$sizes: 40px, 50px, 80px;
@debug list.append($sizes, 100px); // 40px, 50px, 80px, 100px
@debug $sizes; // 40px, 50px, 80px
```

### Maps

Sass 中的 `Maps` 包含键和值，并且可以通过对应的键轻松查找值。语法为：`(<expression>: <expression>, <expression>: <expression>)`。**键必须是唯一的，但值可能重复。**`Maps` 必须用括号括起来

::: warning 注意

每个 `Maps` 都算作一个数组(Lists)。每个 `Maps` 都算作一个 数组(Lists)，其中包含每个键/值对的两个元素列表。例如，`(1: 2, 3: 4)`计为 `(1 2, 3 4)`。

:::

#### 使用 Maps

由于 `Maps` 不是有效的 CSS 值，需要使用 Sass 提供的函数来操作 `Maps`，主要是 [sass:map 内置模块](https://sass-lang.com/documentation/modules/map)

* 查找值：[map.get($map, $key)](https://sass-lang.com/documentation/modules/map#get)
* 遍历 `Maps`：`@each $key, $value in $map {}`
* 添加值：[map.set($map, $key, $value)](https://sass-lang.com/documentation/modules/map#set)
* 合并值：[map.merge($map1, $map2)](https://sass-lang.com/documentation/modules/map#merge)

#### 不变形

与 数组(LIst) 一样，Sass 中的 `Maps` 是*不可变*的，这意味着 `Maps` 值的内容永远不会改变。Sass 的 `Map` 函数都返回新 `Maps` 而不是修改原始 `Maps` 。



