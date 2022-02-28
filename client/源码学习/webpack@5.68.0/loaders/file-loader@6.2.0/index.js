'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = loader;
exports.raw = void 0;

var _path = _interopRequireDefault(require('path'));

var _loaderUtils = require('loader-utils');

var _schemaUtils = require('schema-utils');

var _options = _interopRequireDefault(require('./options.json'));

var _utils = require('./utils');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// file-loader noraml 阶段执行方法
function loader(content) {
  const options = (0, _loaderUtils.getOptions)(this); // loader 配置项提取
  // options 配置项验证
  (0, _schemaUtils.validate)(_options.default, options, {
    name: 'File Loader',
    baseDataPath: 'options',
  });
  const context = options.context || this.rootContext; //
  const name = options.name || '[contenthash].[ext]'; // 为目标文件指定一个自定义文件名 -- 默认为 [contenthash].[ext]
  // 根据传入相应参数，获取模块资源生成文件名 -- 383771a4261853d1bba1d6b6af795eaa.png
  const url = (0, _loaderUtils.interpolateName)(this, name, {
    context, // 上下文
    content, // 资源(Buffer)
    regExp: options.regExp, // 为目标文件路径的一个或多个部分指定正则表达式。
  });
  let outputPath = url; // 文件输出路径

  // options.outputPath：指定将放置目标文件的文件系统路径
  if (options.outputPath) {
    if (typeof options.outputPath === 'function' /** 定义为函数 */) {
      // 则调用函数来获取输出路径
      outputPath = options.outputPath(url, this.resourcePath, context);
    } else {
      // 其他情况下，组装下 options.outputPath 和 url
      outputPath = _path.default.posix.join(options.outputPath, url);
    }
  }

  // 还要考虑项目在服务器上的目录地址(对应 webpack 的 output.publicPath)
  let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`; // 最终输出的位置

  // options.publicPath：指定目标文件的自定义公共路径。
  if (options.publicPath) {
    if (typeof options.publicPath === 'function' /** 如果是函数 */) {
      // 调用函数
      publicPath = options.publicPath(url, this.resourcePath, context);
    } else {
      // 其他的组装一下
      publicPath = `${
        options.publicPath.endsWith('/')
          ? options.publicPath
          : `${options.publicPath}/`
      }${url}`;
    }
    // 序列化一下
    publicPath = JSON.stringify(publicPath);
  }

  // 似乎是对路径又一次转化
  if (options.postTransformPublicPath) {
    publicPath = options.postTransformPublicPath(publicPath);
  }

  // options.emitFile：如果是 true，生成一个文件（向文件系统写入一个文件）。 如果是 false，loader 会返回 public URI，但不会生成文件。 对于服务器端 package，禁用此选项通常很有用。
  if (typeof options.emitFile === 'undefined' || options.emitFile) {
    // 此时向文件系统写入一个文件

    const assetInfo = {}; // 写入资源信息

    // 处理一下文件名称？
    if (typeof name === 'string') {
      let normalizedName = name;
      const idx = normalizedName.indexOf('?');

      if (idx >= 0) {
        normalizedName = normalizedName.substr(0, idx);
      }

      const isImmutable = /\[([^:\]]+:)?(hash|contenthash)(:[^\]]+)?]/gi.test(
        normalizedName
      );

      if (isImmutable === true) {
        assetInfo.immutable = true;
      }
    }

    // 原模块路径 -- 'src/image/01.png'
    assetInfo.sourceFilename = (0, _utils.normalizePath)(
      _path.default.relative(this.rootContext, this.resourcePath)
    );
    // 发送一个文件：https://webpack.docschina.org/api/loaders/#thisemitfile
    this.emitFile(
      outputPath /** 发送文件路径 */,
      content /** 资源 Buffer */,
      null,
      assetInfo /** 文件信息 */
    );
  }

  const esModule =
    typeof options.esModule !== 'undefined' ? options.esModule : true;
  return `${esModule ? 'export default' : 'module.exports ='} ${publicPath};`; // 导出文件发送位置
}

const raw = true; // 接收 Buffer 资源
exports.raw = raw;
