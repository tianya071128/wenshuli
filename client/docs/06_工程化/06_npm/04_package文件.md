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

### bin - 可执行命令

[详情参考](/npm/scripts/)

`bin` 字段指定项目的一个或多个可执行文件，将其安装到 PATH 中，这样在终端可以直接运行命令。

### 其他工具使用的字段

* `browserslist`：配置项目的 Browserslist
* `babel`：配置项目的 Babel
* `eslintConfig`：配置项目的 ESLint
* `sideEffects`：配置项目的 `tree shaking`
* 以 `_`(或 `$`) 开头的保留字段：这些是 `npm` 安装包时添加的字段，是为包注册表保留的元数据，给包注册表以供他们自行决定使用。[可参考](https://stackoverflow.com/questions/42625563/what-are-these-properties-prefixing-underscore-used-for-in-package-json/42625703#42625703)

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


## package-lock.json 文件

`package-lock.json` 文件会为 npm 修改 node_modules 或 package.json 的任何操作自动生成。**描述了生成的确切树，以便后续安装能够生成相同的树，而不管中间依赖项更新如何**。

在开发应用时，该文件推荐提交到存储库中，以用于如下目的：

* 描述依赖关系树的单一表示，以保证团队成员、部署和持续集成安装完全相同的依赖关系。
* 利用存储库的“时间旅行”功能，可以回到 node_modules 先前状态，而无需提交目录本身。
* 通过可读的源代码控制差异促进树变化的更大可见性。
* 通过允许 npm 跳过以前安装的包的重复元数据解析来优化安装过程。
* 从 npm v7 开始，lockfiles 包含足够的信息来获得包树的完整图片，减少了读取 package.json 文件的需要，并允许显着提高性能。

::: warning 注意

package-lock.json 文件的树结构与 node_modules 的模块树结构保持一致。

:::

以下介绍文件的格式，[详情可参考官网](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json#file-format)

```json
{
  # 包名称，匹配 package.json 中 name 字段
  "name": "npm_install_02",
  # 包版本，匹配 package.json 中 version 字段
  "version": "1.0.0",
  # package-lock 文件的版本，对于 npm v6 为 1，对于 npm v7 为 2
  "lockfileVersion": 1,
  # 项目依赖关系
  "dependencies": {
  	...
	}
}
```







## 参考

* [掘金-https://juejin.cn/post/6844903862977953806#heading-8](https://juejin.cn/post/6844903862977953806#heading-8)









