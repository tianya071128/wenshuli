"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

// 构建一个 ESLint 错误，继承 Error
class ESLintError extends Error {
  constructor(messages) {
    super(messages);
    this.name = 'ESLintError';
    this.stack = false;
  }

}

exports.default = ESLintError;