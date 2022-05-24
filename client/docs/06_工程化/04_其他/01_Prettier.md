---
title: Prettier
date: 2021-10-21 15:00:00
permalink: /otherEngineering/
categories: -- 工程化
  -- 其他
tags:
  - null
---

# Prettier

Prettier 是一个 opinionated(表示可配置项很少) 的代码格式化程序。

## 支持的语言列表

- JavaScript (包含实验性功能)
- [JSX](https://facebook.github.io/jsx/)
- [Angular](https://angular.io/)
- [Vue](https://vuejs.org/)
- [Flow](https://flow.org/)
- [TypeScript](https://www.typescriptlang.org/)
- CSS, [Less](http://lesscss.org/), and [SCSS](https://sass-lang.com/)
- [HTML](https://en.wikipedia.org/wiki/HTML)
- [JSON](https://json.org/)
- [GraphQL](https://graphql.org/)
- [Markdown](https://commonmark.org/), including [GFM](https://github.github.com/gfm/) and [MDX](https://mdxjs.com/)
- [YAML](https://yaml.org/)

## Prettier 与 Linter 区别

Prettier 与 Linter（eslint、TSlint 等）比较：

Linter 主要有两类规则：

- 格式规则：例如：[max-len](https://eslint.org/docs/rules/max-len)、[no-mixed-spaces-and-tabs](https://eslint.org/docs/rules/no-mixed-spaces-and-tabs)、[keyword-spacing](https://eslint.org/docs/rules/keyword-spacing)、[comma-style](https://eslint.org/docs/rules/comma-style) ...

  对于这类规则，Prettier 能够减轻对这一套规则的配置需求，能够较好的工作

- **代码质量规则**：例如[no-unused-vars](https://eslint.org/docs/rules/no-unused-vars)、[no-extra-bind](https://eslint.org/docs/rules/no-extra-bind)、[no-implicit-globals](https://eslint.org/docs/rules/no-implicit-globals)、[prefer-promise-reject-errors](https://eslint.org/docs/rules/prefer-promise-reject-errors) ...

  **对于这类规则，Prettier 没有办法做到。这也是 Linter 主要的工作范围**

换句话说，使用 **Prettier 进行格式化**并使用 **linter** 来捕获错误！

## 忽略配置

### 忽略整个文件或文件夹

使用 `.prettierignore` 文件，使用[gitignore 语法](https://git-scm.com/docs/gitignore#_pattern_format)。

### 忽略文件的一部分

使用 `prettier-ignore` 忽略文件的一部分，根据语言的不同格式也不同

[参考](https://prettier.io/docs/en/ignore.html#javascript)

## 配置

### 配置文件

使用 [cosmiconfig](https://github.com/davidtheclark/cosmiconfig)来支持配置文件。这也是比较通用的配置规范

优先级如下：

- `package.json` 文件中的 `"prettier"`键。
- `.prettierrc`用 JSON 或 YAML 编写的文件。
- `.prettierrc.json`，`.prettierrc.yml`，`.prettierrc.yaml`，或`.prettierrc.json5`文件。
- 使用`.prettierrc.js`、`.prettierrc.cjs`、`prettier.config.js`或`prettier.config.cjs`导出对象的文件`module.exports`。
- 一个`.prettierrc.toml`文件。

**在公司项目中，最好在项目根目录下配置 `.prettierrc` 和 `.prettierignore` 文件配置**

### 选项

Prettier 是一个配值项很少的程序，以下是一般选项, 具体见[官方文档-配置项](https://prettier.io/docs/en/options.html)

```js
module.exports = {
  tabWidth: 2, // 缩进字节数
  useTabs: false, // 缩进不使用tab，使用空格
  endOfLine: 'auto', // 结尾是 \n \r \n\r auto
  singleQuote: true, // true: 单引号, false: 双引号
  semi: true, // 末尾是否需要分号
  trailingComma: 'es5', // 在对象或数组最后一个元素后面是否加逗号（在ES5中加尾逗号）
  bracketSpacing: true, // 在对象，数组括号与文字之间加空格 "{ foo: bar }"
  bracketSameLine: true, // 文档显示为 html 结束标签不另起一行, 不起作用, 记录一下...(因为 vscode Prettier 插件不支持)
  jsxBracketSameLine: true,
  htmlWhitespaceSensitivity: 'ignore', // 解决包裹文字时候结束标签的结尾尖括号掉到了下一行 -- 虽然并没有碰到这个问题, 记录一下
};
```

## 问题

目前没有找到方式在 vscode 的 Prettier 插件中使用共享配置和插件的方式, 虽然这也不是重要的内容, 备注一下

## 参考

- [知乎-Prettier](https://zhuanlan.zhihu.com/p/81764012?from_voters_page=true)
- [官方文档](https://prettier.io/docs/en/index.html)
