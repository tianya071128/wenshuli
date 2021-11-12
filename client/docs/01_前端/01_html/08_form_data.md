---
# 页面 title, 同时也是 侧边栏 title
title: 获取表单元素数据
date: 2021-10-21 17:00:00
# 永久链接, 不与页面目录路径
permalink: /html/formDara
categories: 
  - 前端
  - HTML
tags: 
  - null
---
# 获取表单元素数据

## 表单控件获取值

每个表单都有一个 `elements` 属性，是该表单下所有表单元素的集合。 => 包含按钮表单元素，但不包括 `option` 元素

通过 `elements[name]` 可以访问表单字段，如果多个表单元素使用同一 `name`，那么 `elements[name]` 返回一个 `NodeList`，可以通过这种方式获取到表单元素。

### 共有的表单字段

可以动态修改下列属性，来修改表单元素的行为。

* disabled：表示当前表单元素是否禁用。

* form：指向当前表单元素所属的表单。

* name：当前表单元素的名称。

* readOnly：是否只读。

* tabIndex：切换(tab)序号。

* type：当前字段的类型。

  这个属性可以用来判断字段的类型，主要有如下类型

  * select-one：`<select>...</select>`  单选下拉框

  * select-multiple：`<select multiple>...</select>` 多选下拉框

  * submit：提交按钮

    。。。

* value：当前字段提交的值。在文件控件中，该字段是只读的，包含着文件在计算机中的路径。

### 表单元素获取值

* 下拉选择框：select

  遍历 select 选择框的选项，`selectDOM.options` options 属性引用了所有选项。

  通过 `optionDOM.selected` 判断是否选中了值。

  如果 `optionDOM` 没有定义 `value` 属性的话，使用 option 元素之间的内容作为 `value`

  最后根据 `selectDOM.type` 属性区分单选或多选

  ```js
  const field = '表单元素';
  // 选择框，需要遍历每个选项 => 表单元素.options 引用着所有的选项
  for (const option of field.options) {
    // 根据 option.selected 属性判断是否选中项
    if (option.selected) {
      let optValue = "";
      if (option.hasAttribute) {
        optValue = option.hasAttribute("value")
         ? option.value
         : option.text;
      } else {
        optValue = option.attributes["value"].specified
         ? option.value
         : option.text;
      }
      if (field.type === "select-one") {
         // 单选框
      } else {
         // 多选框
      }
    }
  }
  ```

* 单选框：radio

  单选框表单元素共用一个 `name`，所以通过 `formDOM.elements[name]` 返回的是一个 `NodeList`

  遍历 `NodeList`，就可以获取到单选框元素。

  或者通过其他方法(例如：直接 DOM 操作)

  获取到单选框元素后，判断 `checked` 属性是否为 true来判断是否选中

  ```js
  const field = '表单元素';
  
  // 判断是否选中
  if (field.checked) {
      console.log(field.value); // 获取到表单元素值
  }
  ```

* 复选框：checkbox

  与单选框类似，唯一区分是可以多选。所以要遍历全部，而单选框只要获取到一个选中的值，那么的单选框就不需要处理了。

* 文件控件：file

  获取到文件控件元素后，其文件控件的 `files` 属性中存放着文件对象集合。

  具体见 => 待完成

* 按钮：button、input:submit...

  按钮是不需要获取值的，可以直接省略

* 其他控件

  其他大部分控件，都是直接读取 `value` 值获取表单元素值即可。

## 点击按钮发送表单数据

通过设置 `form` 元素的 `action` 和 `method` 等属性，在点击提交按钮(input:submit、button:submit等)时，自动发送 HTTP 到指定 URL。

::: tip 测试

<html-test type="sendForm" />

点击提交按钮后，浏览器会自动根据表单控件的 name 组装参数发送请求。

并且只能发送 GET、POST 请求，编码方式主要是以下方式：

* application/x-www-form-urlencoded（默认值）
* multipart/form-data（上传文件时需设置）
* text/plain

**综上，一般不采用此种方式，而是通过脚本来获取操作**

:::

具体参考：[MDN](https://developer.mozilla.org/zh-CN/docs/Learn/Forms/Sending_and_retrieving_form_data)

## 通过 form 元素获取表单的数据

::: tip 测试

<html-test type="sendForm" />

:::

注意：

* 下列代码中没有使用 encodeURIComponent 对其进行 URI 编码 => 目前一般的库都是会对其进行编码的
* 拿到表单数据后就可以对其进行验证这类的工作

代码如下

```js
      const formDOM = e.target;

      // 1. 借助 formData - 参考 stackoverflow：https://stackoverflow.com/questions/11661187/form-serialize-javascript-no-framework
      const formData = new FormData(formDOM);
      const data = {};
      // URLSearchParams 兼容性问题
      console.log(new URLSearchParams(formData).toString()); // name=1111&hobby=1&hobby=2&sex=1&select=2&selectMultiple=1&selectMultiple=2
      // 或者循环 formData 自己组装，将多选内容组装成数组
      for (const [key, value] of formData.entries()) {
        if (data[key]) {
          data[key] = Array.isArray(data[key])
            ? data[key].concat(value)
            : [data[key], value];
        } else {
          data[key] = value;
        }
      }
      console.log(data); // {name: '1111', hobby: Array(2), sex: '1', select: '2', selectMultiple: Array(2)}

      // 2. 遍历表单的表单控件 - 具体可参考 js 高程第 14 章 14.4
      const data2 = {};
      for (const field of formDOM.elements) {
        // 根据每个表单元素的 type 来区分。
        switch (field.type) {
          case "select-one":
          case "select-multiple":
            // 选择框，需要遍历每个选项 => 表单元素.options 引用着所有的选项
            for (const option of field.options) {
              // 根据 option.selected 属性判断是否选中项
              if (option.selected) {
                let optValue = "";
                if (option.hasAttribute) {
                  optValue = option.hasAttribute("value")
                    ? option.value
                    : option.text;
                } else {
                  optValue = option.attributes["value"].specified
                    ? option.value
                    : option.text;
                }
                if (field.type === "select-one") {
                  data2[field.name] = optValue;
                } else {
                  data2[field.name] = (data2[field.name] || []).concat(
                    optValue
                  );
                }
              }
            }
            break;
          case undefined: // 字段集
          case "file": // 文件输入
          case "submit": // 提交按钮
          case "reset": // 重置按钮
          case "button": //自定义按钮
            // 这些表单元素不理会
            break;
          case "radio": // 单选框
            // 根据 checked 属性判断是否选中
            if (field.checked) {
              data2[field.name] = field.value;
              
            }
            break;
          case "checkbox": // 多选按钮
            if (field.checked) {
              data2[field.name] = (data2[field.name] || []).concat(field.value);
            }
            break;
          default:
            // 其他表单元素，不包含没有 name 的表单元素
            if (field.name.length) {
              data2[field.name] = field.value;
            }
            break;
        }
      }

      console.log(data2); // {name: '1111', hobby: Array(1), sex: '1', select: '2', selectMultiple: Array(2)}
```

## 表单数据验证

**虽然可以通过浏览器自动校验，但是在实践中作用不大，具体参考 [MDN-表单数据校验](https://developer.mozilla.org/zh-CN/docs/Learn/Forms/Form_validation)**



