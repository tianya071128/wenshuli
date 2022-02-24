/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict';

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

class EntryOptionPlugin {
  /**
   * @param {Compiler} compiler the compiler instance one is tapping into 正在实例化的编译器实例
   * @returns {void}
   */
  apply(compiler) {
    /**
     * 注册 entryOption 钩子：在 webpack 选项中的 entry 被处理过之后调用。
     * 为什么不在这里直接处理 entry？ -- 猜测可能是提供一个钩子给用户使用，可以让用户能够有机会处理 entry
     */
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {
      EntryOptionPlugin.applyEntryOption(compiler, context, entry);
      return true; // 返回非 undefined 的值，结束 entryOption(SyncBailHook 类型钩子) 钩子的执行
    });
  }

  /**
   * @param {Compiler} compiler the compiler
   * @param {string} context context directory 上下文路径
   * @param {Entry} entry request 标准化 entry
   * @returns {void}
   */
  static applyEntryOption(compiler, context, entry) {
    if (typeof entry === 'function' /** 如果是函数 */) {
      const DynamicEntryPlugin = require('./DynamicEntryPlugin');
      new DynamicEntryPlugin(context, entry).apply(compiler);
    } else {
      // 当前插件(EntryOptionPlugin)是用来处理 entry 选项的，但是 entry 可能有多个入口或者多个需要处理的 entry(传入了数组：entry: ['./src/index2.js',...])
      const EntryPlugin = require('./EntryPlugin');
      // 遍历 entry - 多入口情况
      for (const name of Object.keys(entry)) {
        const desc = entry[name]; // 入口对象
        // 处理一下 desc，组装成 EntryOptions(与 desc(EntryDescription) 类似，增加了 name 属性，排除了 import 属性)
        const options = EntryOptionPlugin.entryDescriptionToOptions(
          compiler,
          name,
          desc
        );
        // 遍历 desc.import 数组 - 会被标准化为数组 -- 启动时加载的模块，最后一个是出口
        for (const entry of desc.import) {
          /**
           * 每个入口的 import项 都会被视为依赖图的起点，这些起点都通过 EntryPlugin 插件来处理
           * 在这个插件中，会通过 options 生成 EntryDependency 入口依赖对象，并注册 make 钩子，在这个钩子事件中，通过 compilation.addEntry 方法启动模块的构建
           */
          new EntryPlugin(context, entry, options).apply(compiler);
        }
      }
    }
  }

  /**
   * @param {Compiler} compiler the compiler
   * @param {string} name entry name 入口名字
   * @param {EntryDescription} desc entry description 入口描述对象
   * @returns {EntryOptions} options for the entry entry 的选项
   */
  static entryDescriptionToOptions(compiler, name, desc) {
    /** @type {EntryOptions} */
    // 组装成入口配置项 - 与 EntryDescription 类似，增加了 name 属性，排除了 import 属性
    const options = {
      name,
      filename: desc.filename,
      runtime: desc.runtime,
      layer: desc.layer,
      dependOn: desc.dependOn,
      publicPath: desc.publicPath,
      chunkLoading: desc.chunkLoading,
      asyncChunks: desc.asyncChunks,
      wasmLoading: desc.wasmLoading,
      library: desc.library,
    };
    // 检测一些内容
    if (desc.layer !== undefined && !compiler.options.experiments.layers) {
      throw new Error(
        "'entryOptions.layer' is only allowed when 'experiments.layers' is enabled" // 入口选项。层“仅在”试验时允许。“图层”已启用
      );
    }
    if (desc.chunkLoading) {
      const EnableChunkLoadingPlugin = require('./javascript/EnableChunkLoadingPlugin');
      EnableChunkLoadingPlugin.checkEnabled(compiler, desc.chunkLoading);
    }
    if (desc.wasmLoading) {
      const EnableWasmLoadingPlugin = require('./wasm/EnableWasmLoadingPlugin');
      EnableWasmLoadingPlugin.checkEnabled(compiler, desc.wasmLoading);
    }
    if (desc.library) {
      const EnableLibraryPlugin = require('./library/EnableLibraryPlugin');
      EnableLibraryPlugin.checkEnabled(compiler, desc.library.type);
    }
    return options;
  }
}

module.exports = EntryOptionPlugin;
