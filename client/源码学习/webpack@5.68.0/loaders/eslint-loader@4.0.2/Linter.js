"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _process = _interopRequireDefault(require("process"));

var _path = require("path");

var _fsExtra = require("fs-extra");

var _loaderUtils = require("loader-utils");

var _ESLintError = _interopRequireDefault(require("./ESLintError"));

var _createEngine = _interopRequireDefault(require("./createEngine"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Linter {
  constructor(loaderContext, options) {
    this.loaderContext = loaderContext; // loader 执行上下文
    this.options = options; // loader 配置项
    this.resourcePath = this.parseResourcePath(); // 解析资源路径 - src\\index.js
    const {
      CLIEngine,
      engine
    } = (0, _createEngine.default)(options); // 创建 ESLint 引擎: { CLIEngine: linting 程序 - 默认为 eslint, engine: linting 程序实例(根据 options 创建) }
    this.CLIEngine = CLIEngine; // linting 程序 - 默认为 eslint
    this.engine = engine; // linting 程序实例(根据 options 创建)
  }

  // 解析资源路径
  parseResourcePath() {
    const cwd = _process.default.cwd(); // Webpack(Node 启动目录) 启动目录上下文 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader

    let {
      resourcePath // 资源的路径 -- C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\index.js
    } = this.loaderContext; // remove cwd from resource path in case webpack has been started from project 从资源路径中删除cwd，以防从项目中启动了webpack
    // root, to allow having relative paths in .eslintignore 根，以允许在中具有相对路径。埃斯林特忽略
    // istanbul ignore next 伊斯坦布尔下一个

    if (resourcePath.indexOf(cwd) === 0) {
      resourcePath = resourcePath.substr(cwd.length + (cwd === '/' ? 0 : 1)); // 如果资源路径中包含 cwd，则将其清除，得到：src\\index.js
    }

    return resourcePath;
  }

  // 启动代码检查，输入资源源码，返回检查结果
  lint(content) {
    try {
      // 使用 linting 代码检查实例进行代码检查工作，返回检查后的结果
      return this.engine.executeOnText(content, this.resourcePath, true);
    } catch (_) {
      // 如果存在错误的话，那么发送一个错误信息
      this.getEmitter(false)(_);
      return {
        src: content
      };
    }
  }

  // 打印输出 - 已经通过 lint 方法进行代码结果了
  printOutput(data) {
    const {
      options // eslint-loader 配置项
    } = this;

    // skip ignored file warning 跳过忽略的文件警告
    if (this.constructor.skipIgnoredFileWarning(data)) {
      return;
    }
    
    // quiet filter done now 安静的过滤器现在完成了
    // eslint allow rules to be specified in the input between comments eslint允许在注释之间的输入中指定规则
    // so we can found warnings defined in the input itself 因此，我们可以在输入本身中找到定义的警告
    const res = this.filter(data); // if enabled, use eslint auto-fixing where possible

    // optins.fix：此选项将启用 ESLint 自动修复功能 -- 注意：此选项将更改源文件。
    if (options.fix) {
      this.autoFix(res); // 进行代码修复
    }
    
    // skip if no errors or warnings 如果没有错误或警告，请跳过
    // 如果错误或警告不存在，那么直接略过
    if (res.errorCount < 1 && res.warningCount < 1) {
      return;
    }

    const results = this.parseResults(res);
    
    // Do not analyze if there are no results or eslint config 如果没有结果或 eslint 配置，请不要进行分析
    if (!results) {
      return;
    }

    const messages = options.formatter(results); // 调用格式化器格式化输出结果
    this.reportOutput(results, messages); // 如果用户配置了 outputReport(将错误的输出写入文件) 则将错误输出到文件中
    // 检测是否配置了 failOnError(如果为 true 那么有任何 eslint 错误，Loader 将导致模块构建失败。)、failOnWarning(如果为 true，如果有任何 eslint 警告，Loader 将导致模块构建失败。)
    // 并且检查存在错误或警告，此时直接导致模块构建失败
    this.failOnErrorOrWarning(res, messages);
    const emitter = this.getEmitter(res); // 获取发送 webpack 错误或警告的方法：loaderContext.emitError 或 loaderContext.emitWarning
    emitter(new _ESLintError.default(messages)); // 发送错误信息
  }

  // 跳过忽略的文件警告
  static skipIgnoredFileWarning(res) {
    return res && res.warningCount === 1 && res.results && res.results[0] && res.results[0].messages[0] && res.results[0].messages[0].message && res.results[0].messages[0].message.indexOf('ignore') > 1;
  }

  // 如果需要忽略警告， 过滤过忽略的警告
  filter(data) {
    const res = data;
    // quiet filter done now 安静的过滤器现在完成了
    // eslint allow rules to be specified in the input between comments eslint允许在注释之间的输入中指定规则
    // so we can found warnings defined in the input itself 因此，我们可以在输入本身中找到定义的警告

    // options.quiet：如果此选项设置为 true，Loader 将仅处理和报告错误并忽略警告
    if (this.options.quiet && res && res.warningCount && res.results && res.results[0]) {
      res.warningCount = 0;
      res.results[0].warningCount = 0;
      res.results[0].messages = res.results[0].messages.filter(message => message.severity !== 1);
    }

    return res;
  }

  // 启用 ESLint 自动修复功能。
  autoFix(res) {
    if (res && res.results && res.results[0] && (res.results[0].output !== res.src || res.results[0].fixableErrorCount > 0 || res.results[0].fixableWarningCount > 0)) {
      this.CLIEngine.outputFixes(res);
    }
  }

  // 为每个结果添加文件名，以便格式化程序可以有相关的文件名
  parseResults({
    results
  }) {
    // add filename for each results so formatter can have relevant filename 为每个结果添加文件名，以便格式化程序可以有相关的文件名
    if (results) {
      results.forEach(r => {
        // eslint-disable-next-line no-param-reassign
        r.filePath = this.loaderContext.resourcePath;
      });
    }

    return results;
  }

  // 将错误的输出写入文件
  reportOutput(results, messages) {
    const {
      outputReport // 将错误的输出写入文件，例如用于报告 Jenkins CI 的 checkstyle xml 文件
    } = this.options;

    if (!outputReport || !outputReport.filePath) {
      return;
    }

    let content = messages; // if a different formatter is passed in as an option use that 如果另一个格式化程序作为选项传入，请使用

    if (outputReport.formatter) {
      content = outputReport.formatter(results);
    }

    let filePath = (0, _loaderUtils.interpolateName)(this.loaderContext, outputReport.filePath, {
      content
    });

    if (!(0, _path.isAbsolute)(filePath)) {
      filePath = (0, _path.join)( // eslint-disable-next-line no-underscore-dangle
      this.loaderContext._compiler.options.output.path, filePath);
    }

    (0, _fsExtra.ensureFileSync)(filePath);
    (0, _fsExtra.writeFileSync)(filePath, content);
  }

  // 检测是否配置了 failOnError(如果为 true 那么有任何 eslint 错误，Loader 将导致模块构建失败。)、failOnWarning(如果为 true，如果有任何 eslint 警告，Loader 将导致模块构建失败。)
  // 并且检查存在错误或警告，此时直接导致模块构建失败
  failOnErrorOrWarning({
    errorCount, // 检查出错误总数
    warningCount // 检查出警告总数
  }, messages) {
    const {
      failOnError, // 如果为 true 那么有任何 eslint 错误，Loader 将导致模块构建失败。
      failOnWarning // 如果为 true，如果有任何 eslint 警告，Loader 将导致模块构建失败。
    } = this.options;

    // 处理错误，如果配置了 failOnError， 此时直接导致模块构建失败
    if (failOnError && errorCount) {
      // 抛出错误即可
      throw new _ESLintError.default(`Module failed because of a eslint error.\n${messages}`);
    }

    // 处理警告，如果配置了 failOnWarning 此时直接导致模块构建失败
    if (failOnWarning && warningCount) {
      throw new _ESLintError.default(`Module failed because of a eslint warning.\n${messages}`);
    }
  }

  // 获取发送 webpack 错误或警告的方法：loaderContext.emitError 或 loaderContext.emitWarning
  getEmitter({
    errorCount // 错误总数
  }) {
    const {
      options, // eslint 配置项
      loaderContext // loader 执行上下文
    } = this;

    // default behavior: emit error only if we have errors 默认行为：仅当我们有错误时才发出错误
    let emitter = errorCount ? loaderContext.emitError : loaderContext.emitWarning; // force emitError or emitWarning if user want this

    if (options.emitError /** 如果此选项设置为 true，Loader 将始终返回错误*/) {
      emitter = loaderContext.emitError;
    } else if (options.emitWarning /** 如果选项设置为 true，加载程序将始终返回警告*/) {
      emitter = loaderContext.emitWarning;
    }

    return emitter;
  }

}

exports.default = Linter;