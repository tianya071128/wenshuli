---
title: watch
date: 2021-10-21 15:00:00
permalink: /webpack/watch
categories: -- 工程化
  -- webpack
tags:
  - null
---

# watch

webpack 可以监听文件变动，当文件发生修改后进行重新编译。简单原理就是**通过 Node(或其他文件系统) 监听项目相关文件，当文件变化时重新编译一下**。

## 配置项

watch 模式相关的配置项并不多

### watch - 启用 watch 模式

启动 watch 模式。

```js
module.exports = {
  //...
  watch: true,
};
```

::: warning 注意

[webpack-dev-server](https://github.com/webpack/webpack-dev-server) 和 [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) 里 Watch 模式默认开启。

:::

### watchOptions - 其他配置项

用来定制 watch 模式的选项：

* **aggregateTimeout**：当第一个文件更改，会在重新构建前增加延迟。这个选项允许 webpack 将这段时间内进行的任何其他更改都聚合到一次重新构建里。
* ignored：排除某些文件的监听。
* poll：开启轮询检测文件是否修改。可以用来防止监听没有生效。
* 其他不重要配置项

```js
module.exports = {
  //...
  watchOptions: {
    aggregateTimeout: 200, // 延迟 200ms 构建
    poll: 1000, // 1000ms 轮询一次
    ignored: '**/node_modules', // 排除 node_modules 文件夹
  },
};
```

## 原理解析

[源码解析详见](https://github.com/tianya071128/wenshuli/blob/master/client/%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/webpack%405.68.0/lib/Watching.js)

* 在 `lib/webpack.js` 文件生成 `compiler` 类后：

  * 如果不是 watch 模式，直接通过 `compiler.run` 启动构建
  * 如果是 watch 模式，通过 `compiler.watch` 启动监听

  ```js
  const { compiler, watch, watchOptions } = create();
  // 如果需要对文件改动监听的话
  if (watch) {
    compiler.watch(watchOptions, callback);
  } else {
    // 通过 compiler.run 启动构建
    compiler.run((err, stats) => {
      compiler.close((err2) => {
        callback(err || err2, stats);
      });
    });
  }
  return compiler;
  ```

* 在 `lib/Compiler.js` 中的 `watch` 方法生成 `Watching` 类并返回这个类：

  ```js
  watch(watchOptions, handler) {
    // 是否运行的标记
    if (this.running) {
      return handler(new ConcurrentCompilationError()); // 重复编译报错
    }
    
    this.running = true; // 正在运行编译
    this.watchMode = true; // watch 模式标识
    this.watching = new Watching(this, watchOptions, handler);
    return this.watching; // 返回 watching 类
  }
  ```

* 在 `lib/Watching.js` 中，所有监听逻辑集中在这里：

  1. `Watching` 类的构造器中会调用 `_invalidate` 方法启动监听

  2.  `_invalidate` 方法启动 `_go` 方法进行构建 

  3. `_go` 方法中进行资源的构建：

     1. 调用 `Compiler.compile()` 方法启动构建资源(生成所有的 chunks)
     2.  调用 `Compiler.emitAssets()` 发送资源到目录中
     3. 调用 `_done` 方法完成构建之后一些其他工作

  4. `_done` 方法完成构建之后一些其他工作，调用 `watch` 方法启动监听

  5. `watch` 方法启动监听：

     1. 调用 `Compiler.watchFileSystem.watch` 文件监听系统对依赖文件进行监听

        > 在 `Compilation`  项目构建过程中，会收集到项目的依赖在如下属性中：
        >
        > * `compilation.fileDependencies`：可以是文件或目录。对于文件，跟踪内容和存在更改 | 对于目录，仅跟踪存在和时间戳更改
        > * `compilation.contextDependencies`：仅目录、目录内容（和子目录的内容，…），跟踪存在更改。假设存在，当在没有进一步信息的情况下找不到目录时，将发出删除事件
        > * `compilation.missingDependencies`：可以是文件或目录，仅跟踪存在更改。预期不存在，最初未找到时不会发出删除事件。
        >   * 假如文件和目录存在，如果在没有进一步信息的情况下找不到它们，则会发出删除事件
        >   * 假如文件和目录不存在，不会未发出移除事件

     2. 会注册一个一次性事件，在重新构建时触发(`webpack` 会将一段时间内进行的任何其他更改都聚合到一次重新构建里)，之后就重新触发 `_invalidate` 方法重新构建并重新监听

  





