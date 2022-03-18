"use strict";

const babel = require("@babel/core");

// 添加 caller 配置项 -- https://www.babeljs.cn/docs/options#caller
module.exports = function injectCaller(opts, target) {
  if (!supportsCallerOption()) return opts; // 如果不支持 caller 配置项，直接返回
  // 否则添加一个 caller 配置项
  return Object.assign({}, opts, {
    caller: Object.assign({
      name: "babel-loader",
      // Provide plugins with insight into webpack target. 提供插件洞察 webpack 目标
      // https://github.com/babel/babel-loader/issues/787
      target, // 对应 webpack.options
      // Webpack >= 2 supports ESM and dynamic import. Webpack >= 2 支持ESM和动态导入
      supportsStaticESM: true,
      supportsDynamicImport: true,
      // Webpack 5 supports TLA behind a flag. We enable it by default Webpack 5支持旗帜后面的TLA。我们默认启用它
      // for Babel, and then webpack will throw an error if the experimental 然后webpack会抛出一个错误，如果实验
      // flag isn't enabled. 国旗不启用
      supportsTopLevelAwait: true
    }, opts.caller)
  });
};

// TODO: We can remove this eventually, I'm just adding it so that people have 待办事项:我们最终可以删除它，我只是添加它，以便人们有
// a little time to migrate to the newer RCs of @babel/core without getting 有一点时间去迁移到 @babel/core 的更新的 Rc
// hard-to-diagnose errors about unknown 'caller' options. 很难诊断未知的“caller”选项的错误
let supportsCallerOptionFlag = undefined;

// 检测是否支持 caller 配置项
function supportsCallerOption() {
  // 惰性检测
  if (supportsCallerOptionFlag === undefined) {
    try {
      // Rather than try to match the Babel version, we just see if it throws 我们不尝试匹配 Babel 版本，我们只是看看它是否抛出
      // when passed a 'caller' flag, and use that to decide if it is supported. 当传递一个 “caller” 标志，并使用它来决定是否支持它
      babel.loadPartialConfig({
        caller: undefined,
        babelrc: false,
        configFile: false
      });
      supportsCallerOptionFlag = true; // 如果没有出错的话，说明支持 “caller” 配置
    } catch (err) {
      supportsCallerOptionFlag = false;
    }
  }

  return supportsCallerOptionFlag;
}