"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const babel = require("@babel/core");

const {
  promisify
} = require("util");

const LoaderError = require("./Error");

// 采用遵循常见的错误优先的回调风格的函数（也就是将 (err, value) => ... 回调作为最后一个参数），并返回一个返回 promise 的版本。
const transform = promisify(babel.transform); 

// 通过 babel.transform 对模块内容进行转译
module.exports = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(function* (source, options) {
    let result; // 转换结果

    try {
      // 转译模块
      result = yield transform(source, options);
    } catch (err) {
      // 转译过程中出现异常，抛出错误
      throw err.message && err.codeFrame ? new LoaderError(err) : err;
    }

    // 不存在结果值，返回 null
    if (!result) return null;
    
    // We don't return the full result here because some entries are not 这里我们不返回完整的结果，因为有些条目不是
    // really serializable. For a full list of properties see here: 真的可序列化的。有关完整的属性列表，请参见此处
    // https://github.com/babel/babel/blob/main/packages/babel-core/src/transformation/index.js
    // For discussion on this topic see here: 有关此主题的讨论请参阅此处
    // https://github.com/babel/babel-loader/pull/629
    const {
      ast, // 模块的 ast
      code, // 编译后代码
      map, // soucemap 信息
      metadata,
      sourceType
    } = result;

    // soucemap.sourcesContent： 原始文件内容
    if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
      map.sourcesContent = [source];
    }

    return {
      ast,
      code,
      map,
      metadata,
      sourceType
    };
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

module.exports.version = babel.version;