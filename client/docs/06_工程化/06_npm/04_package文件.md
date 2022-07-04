---
title: package 文件
date: 2021-10-21 15:00:00
permalink: /npm/packageFile
categories: -- 工程化
  -- npm
tags:
  - null
---

# package 文件

## package.json 文件

这里介绍一下常用字段以及其他其他系统添加的字段，[详细可参考文档](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)

### name - 姓名

* 如果发布包的话，那么这个字段是必需的
* 如果不发布包的话，那么这个字段是可选的

### version - 版本

与 `name` 字段一样，如果需要发布包的话，那么就是必需的，否则就是可选的

`version` 字段规则应该符合[语义版本控制](https://docs.npmjs.com/about-semantic-versioning)

### private - 私人的

如果设置 `private: true`，那么 npm 将拒绝发布它。这是一种防止意外发布私有存储库的方法。

### files - 发布包含的文件

`files` 是一个文件模式数组，描述了当您的包作为依赖项安装时要包含的文件列表。在 `npm publish` 发布包时，会将这些文件上传，其他文件则会被忽略。省略该字段将使其默认为 ["*"]，这意味着它将包括所有文件。

`“package.json#files”` 字段中包含的文件不能通过 `.npmignore` 或 `.gitignore` 排除。

一些特殊的文件和目录也被包含或排除，无论它们是否存在于 files 数组中：

* 无论设置如何，始终包含某些文件：`package.json`、`README`、`LICENSE` / `LICENCE`、`“main”` 字段中的文件
* 以及某些文件总是被忽略：`.git`、`CVS`、`.svn`、`.hg`、`.lock-wscript`、`.wafpickle-N`、`.*.swp`、`.DS_Store`、`npm-debug.log`、`._*`、`.npmrc`、`node_modules`、`package-lock.json` (如果您希望发布它，请使用 [`npm-shrinkwrap.json`](https://docs.npmjs.com/cli/v8/configuring-npm/npm-shrinkwrap-json) )

```json
# 例如 vue 包中，安装时只会安装如下文件(文件夹)，以及其他必须包含的文件
{
  "files": [
    "index.js",
    "index.mjs",
    "dist",
    "compiler-sfc",
    "server-renderer",
    "macros.d.ts",
    "macros-global.d.ts",
    "ref-macros.d.ts"
  ],
}
```

### 依赖项

以下几个字段描述了项目的依赖项，[详细说明参考](/npm/dependent/)

* dependencies - 业务依赖
* devDependencies - 开发依赖
* peerDependencies - 对等依赖
* peerDependenciesMeta - 用于为 npm 提供有关如何使用 `peerDependencies` 的更多信息。
* bundledDependencies - 打包依赖
* optionalDependencies - 可选依赖

### main、browser、module - 程序入口点

这几个字段决定了包程序的入口点：

* main：包的入口文件，browser 环境和 node 环境均可使用
* module：包的 ESM 规范的入口文件，browser 环境和 node 环境均可使用
* browser：包在 browser 环境下的入口文件

而根据场景不同，加载包时程序入口文件的优先级也就不同：

* 使用 `webpack`(或其他构建工具) ：此时可以由 [webpack.resolve.mainFields](https://webpack.docschina.org/configuration/resolve/#resolvemainfields)进行配置，指定的 [target](https://webpack.docschina.org/concepts/targets)进行配置，指定的 [target](https://webpack.docschina.org/concepts/targets) 不同，默认值也会有所不同：
  * `target` 属性设置为 `webworker`, `web` 或者没有指定：`['browser', 'module', 'main']`
  * 其他任意的 `target`（包括 `node`）：`['module', 'main']`
* 通过 `node` 直接加载包：此时只有 `main` 字段有效

### scripts - 可执行脚本

`scripts` 字段是一个字典，其中包含在包生命周期的不同时间运行的脚本命令。



### 其他字段

* description - 描述

  这是一个字符串。这有助于人们发现您的包，因为它在 npm 搜索中列出。

* keywords - 关键词

	把关键字放在里面。它是一个字符串数组。这有助于人们发现你的包，因为它在 npm 搜索中列出。

* homepage - 主页

  项目主页的 url。

  ```json
  {
    "homepage": "https://github.com/owner/project#readme"
  }
  ```

* bugs - bug 提交信息

  项目问题跟踪器的 url 或应向其报告问题的电子邮件地址：

  ```json
  {
    "bugs": {
      "url" : "https://github.com/owner/project/issues",
      "email" : "project@hostname.com"
    }
  }
  ```

  如果提供了一个 url，它将被 `npm bugs` 命令使用。

* license - 许可证

	指定包的许可证，以便人们知道他们如何被允许使用它，以及您对其施加的任何限制。

* author - 作者

  指定作者信息，是一个带有 `“name”` 字段以及可选的 `“url”` 和 `“email”` 的对象：

  ```json
  {
    "author": {
      "name" : "Barney Rubble",
      "email" : "b@rubble.com",
      "url" : "http://barnyrubble.tumblr.com/"
    }
  }
  ```
  
* repository - 存储库

  指定代码所在的位置

  ```json
  {
    "repository": {
      "type": "git",
      "url": "https://github.com/npm/cli.git"
    }
  }
  ```

  

## 参考

* [掘金-https://juejin.cn/post/6844903862977953806#heading-8](https://juejin.cn/post/6844903862977953806#heading-8)









