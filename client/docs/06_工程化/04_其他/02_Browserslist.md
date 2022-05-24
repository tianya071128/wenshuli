---
title: Browserslist
date: 2021-10-21 15:00:00
permalink: /Browserslist/
categories: -- 工程化
  -- 其他
tags:
  - null
---

# Browserslist

用于在不同前端工具之间共享目标浏览器和 `Node.js` 版本的配置。通俗的理解就是**根据规则来配置项目的目标浏览器**

可用于如下工具：

- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Babel](https://github.com/babel/babel/tree/master/packages/babel-preset-env)
- [postcss-preset-env](https://github.com/jonathantneal/postcss-preset-env)
- [eslint-plugin-compat](https://github.com/amilajack/eslint-plugin-compat)
- [stylelint-no-unsupported-browser-features](https://github.com/ismay/stylelint-no-unsupported-browser-features)
- [postcss-normalize](https://github.com/jonathantneal/postcss-normalize)
- [obsolete-webpack-plugin](https://github.com/ElemeFE/obsolete-webpack-plugin)
- 。。。

## 查询

`Browserslist` 将使用来自以下来源之一的浏览器和 Node.js 版本查询：

1. 当前或父目录中 `package.json` 文件中的 `browserslist` 键。
2. 当前或父目录中的 `.browserslistrc` 配置文件。
3. 当前或父目录中的 `browserslist` 配置文件。
4. `BROWSERSLIST` 环境变量。
5. 如果上述都没有，那么将采用默认值：`> 0.5%, last 2 versions, Firefox ESR, not dead`

### 查询语句列表

可以通过查询指定浏览器和 Node.js 版本（不区分大小写）：

- `defaults`：默认值，也可以使用 `defaults` 这个关键字采用默认查询，即 `> 0.5%, last 2 versions, Firefox ESR, not dead`
- 按使用统计：
  - `> 5%`：全球使用统计选择的浏览器版本。 >=、< 和 <= 也可以。
  - `> 5% in US`：使用美国使用统计数据。它接受两个字母的国家代码。
- 最新版本：
  - `last 2 versions`：每个浏览器的最后 2 个版本。
  - `last 2 Chrome versions`：最近 2 个版本的 Chrome 浏览器。
- 指定浏览器版本：
  - `ie 9`：指定浏览器版本
  - `ie 6-8`：选择一个包含范围的版本。
  - `Firefox > 20`：20 之后的 Firefox 版本。>=、< 和 <= 也可以。它也适用于 Node.js。
- `dead`：24 个月没有官方支持或更新的浏览器。现在是 IE 10、IE_Mob 11、黑莓 10、黑莓 7、三星 4、OperaMobile 12.1 和百度所有版本。
- `supports es6-module`：支持特定功能的浏览器。这里的 es6-module 是 [Can I Use](https://caniuse.com/) 页面 URL 处的 feat 参数。可以在 [caniuse-lite/data/features](https://github.com/ben-eb/caniuse-lite/tree/main/data/features) 找到所有可用功能的列表。
- `not ie <= 8`：从之前的查询中排除 IE 8 及更低版本。

### 组合查询

有如下三种组合器：

| 组合器类型 | 说明                                                                                   | 插图                                                                 | 例子                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `or`/`,`   | 查询并集。<br />**注意：在配置文件中每行都用 `or` 组合器组合**                         | <img src="/img/122.svg" alt="Union of queries" style="width: 50%" /> | `> .5% or last 2 versions`<br />使用率大于 0.5% 或者最后两个版本                                                                                                        |
| `and`      | 查询合集                                                                               | <img src="/img/123.svg" alt="Union of queries" style="width: 50%" /> | `> .5% and last 2 versions`<br />使用率大于 0.5% 并且是最后两个版本                                                                                                     |
| `not`      | 排除指定的查询。<br />**注意：这个需要结合其他查询，用来从之前的查询中排除特定浏览器** | <img src="/img/124.svg" alt="Union of queries" style="width: 50%" /> | 这三个是等价的：使用率大于 0.5% 的版本中排除不是最后两个版本<br />`> .5% and not last 2 versions`<br />`> .5% or not last 2 versions`<br />`> .5%, not last 2 versions` |

## 配置

### 配置文件

主流有如下两种方式配置：

- 使用单独的 `.browserslistrc` 配置文件，语法与主流配置文件类似：

  ```bash
  # 注释以 # 开头

  last 1 version # 每一行表示一个浏览器查询语句
  > 1%
  IE 10
  ```

- 在 `package.json` 中使用 `browserslist` 键，这样可以减少项目配置文件，语法如下：

  ```json
  {
    "browserslist": ["last 1 version", "> 1%", "IE 10"]
  }
  ```

### 针对不同环境进行配置

可以根据各种环境指定不同的浏览器查询。`Browserslist` 将根据 `BROWSERSLIST_ENV` 或 `NODE_ENV` 变量选择查询，默认查找 `production` 环境

* 在 `.browserslistrc` 配置中：

  ```bash
  [production]
  > 1%
  ie 10
  
  [modern]
  last 1 chrome version
  last 1 firefox version
  
  [ssr]
  node 12
  ```

* 在 `package.json` 中：

  ```json
    "browserslist": {
      "production": [
        "> 1%",
        "ie 10"
      ],
      "modern": [
        "last 1 chrome version",
        "last 1 firefox version"
      ],
      "ssr": [
        "node 12"
      ]
    }
  ```

### 可共享配置

可通过 `extends` 关键字来引用其他配置：

```bash
  "browserslist": [
    "extends browserslist-config-mycompany"
  ]
```





## 内部基础原理

`Browserslist` 内部会使用 [caniuse-lite](https://github.com/ben-eb/caniuse-lite) 库来查询目标浏览器。

`caniuse-lite` 库是 [Can I Use](https://caniuse.com/)(这个网站用来查询浏览器兼容性)的数据库的小版本，只有一些必需数据，这些数据存放在 [caniuse-lite/data](https://github.com/browserslist/caniuse-lite/tree/main/data) 中

### 浏览器数据更新

因为 `Browserslist` 查询依赖 [caniuse-lite](https://github.com/ben-eb/caniuse-lite)，而这个的查询数据都是存在库的本地，即 [caniuse-lite/data](https://github.com/browserslist/caniuse-lite/tree/main/data) 中，所以我们需要定期更新 `Browserslist` 中的 `caniuse-lite` 版本。

使用：`npx browserslist@latest --update-db` 定期更新。此更新将为 `Autoprefixer` 或 `Babel` 等 `polyfill` 工具带来有关新浏览器的数据，并减少已经不必要的 `polyfill`。

需要定期更新主要有如下三个原因：

- 在查询中使用最新的浏览器版本和统计信息：例如 `last 2 versions` or `>1%` ，如果在 2 年前创建了项目但是没有更新依赖项，那么返回结果是 2 年前的浏览器
- 实际的浏览器数据将导致使用更少的 `polyfill`。它将减少 JS 和 CSS 文件的大小并提高网站性能。
- `caniuse-lite`重复数据删除：在不同工具中同步版本。

## 查看项目的目标浏览器

在项目目录中运行 `npx browserslist` 以查看您的查询选择了哪些浏览器。

```bash
$ npx browserslist
and_chr 61
and_ff 56
and_qq 1.2
and_uc 11.4
android 56
baidu 7.12
bb 10
chrome 62
edge 16
firefox 56
ios_saf 11
opera 48
safari 11
samsung 5
```

## 参考

- [git - browserslist](https://github.com/browserslist/browserslist#tools)
