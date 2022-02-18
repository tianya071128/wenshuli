"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;
exports.raw = void 0;

var _path = _interopRequireDefault(require("path"));

var _loaderUtils = require("loader-utils");

var _schemaUtils = require("schema-utils");

var _mimeTypes = _interopRequireDefault(require("mime-types"));

var _normalizeFallback = _interopRequireDefault(require("./utils/normalizeFallback"));

var _options = _interopRequireDefault(require("./options.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * 验证将文件转化为 DataURL 内嵌到文件中(如果文件小于字节限制，则可以返回 DataURL。)
 */
function shouldTransform(limit, size) {
  // 如果设置的为 boolean，那么由 limit 决定
  if (typeof limit === 'boolean') {
    return limit;
  }

  // 如果设置的是 string
  if (typeof limit === 'string') {
    // 先将 string 类型转化为 number，进行比较
    return size <= parseInt(limit, 10);
  }

  // 如果设置的是 number
  if (typeof limit === 'number') {
    // 进行比较
    return size <= limit;
  }

  // 如果 limit 参数没有设置的话，默认转化为 DataURL
  return true;
}

/**
 * 根据 option.mimetype 配置，获取到模块的 MIME 类型
 * @param {String | Boolean} mimetype 设置要转换的文件的 MIME 类型。如果未指定，文件扩展名将用于查找 MIME 类型。
 * @param {String} resourcePath 模块文件路径 - "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\image\\01.png"
 * @returns {Stinrg} 文件 MIME
 */
function getMimetype(mimetype, resourcePath) {
  // option.mimetype 设置的是 布尔值
  if (typeof mimetype === 'boolean') {
    if (mimetype) {
      // 使用 mime-types 库进行 MIME 检测
      const resolvedMimeType = _mimeTypes.default.contentType(_path.default.extname(resourcePath));

      if (!resolvedMimeType) {
        return '';
      }

      return resolvedMimeType.replace(/;\s+charset/i, ';charset');
    }

    return '';
  }

  // option.mimetype 设置的是 string -- 直接使用用户定义的
  if (typeof mimetype === 'string') {
    return mimetype;
  }

  // 其他情况下，默认使用 mime-types 库进行 MIME 检测
  const resolvedMimeType = _mimeTypes.default.contentType(_path.default.extname(resourcePath));

  // 没有检测到 MIME，返回 ''
  if (!resolvedMimeType) {
    return '';
  }

  return resolvedMimeType.replace(/;\s+charset/i, ';charset');
}

/**
 * 根据 option.encoding(似乎没有暴露给开发者) 配置，获取到模块转化的编码格式 -- 默认为 base64
 * @param {Boolean | String} encoding 编码类型
 * @returns {String} 编码方式 - 默认为 base64
 */
function getEncoding(encoding) {
  if (typeof encoding === 'boolean') {
    return encoding ? 'base64' : '';
  }

  if (typeof encoding === 'string') {
    return encoding;
  }

  return 'base64';
}

/**
 * 根据编码方法(encoding) 和 资源类型(mimetype) 转化为 DataURL - 默认为 data:image/png;base64,...
 * @param {any} generator option.generator 自定义配置转化函数
 * @param {String} mimetype 模块资源 MIME
 * @param {String} encoding 需要转化为 DataURL 的编码方式 - base64
 * @param {Buffer} content 模块资源
 * @param {String} resourcePath 模块路径
 * @returns {String} 转化为 DATAURL 的资源 -- 默认为 data:image/png;base64,
 */
function getEncodedData(generator, mimetype, encoding, content, resourcePath) {
  // 如果用户自定义了转化 DataURL 方法，则使用它
  if (generator) {
    return generator(content, mimetype, encoding, resourcePath);
  }

  // 否则使用 content.toString(encoding) 方法转化
  return `data:${mimetype}${encoding ? `;${encoding}` : ''},${content.toString( // eslint-disable-next-line no-undefined
  encoding || undefined)}`;
}

// 导出函数 - normal 阶段执行方法
function loader(content) {
  // Loader Options loader 配置项
  const options = (0, _loaderUtils.getOptions)(this) || {};
  // 验证 loader 配置项
  (0, _schemaUtils.validate)(_options.default, options, {
    name: 'URL Loader',
    baseDataPath: 'options'
  }); // No limit or within the specified limit 无限制或在规定限制内

  if (shouldTransform(options.limit, content.length) /** 判断是否转化为 DataURL */) {
    // 此时将文件内容转化为 DataURL(即 base64 格式)
    const {
      resourcePath
    } = this; // 模块路径 -- "C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\src\\image\\01.png"
    const mimetype = getMimetype(options.mimetype, resourcePath); // 获取模块的 MIME -- "image/png"
    const encoding = getEncoding(options.encoding); // 获取到模块转化的编码格式 -- 默认为 base64

    // 如果传入的 content 是字符串的话，那么将其转为 Buffer
    if (typeof content === 'string') {
      // eslint-disable-next-line no-param-reassign
      content = Buffer.from(content);
    }

    const encodedData = getEncodedData(options.generator, mimetype, encoding, content, resourcePath); // 根据编码方法(encoding) 和 资源类型(mimetype) 转化为 DataURL - 默认为 data:image/png;base64,...
    const esModule = typeof options.esModule !== 'undefined' ? options.esModule : true;
    // 返回这个转化后的 DataURL，这样的话，当导入这个模块的时候，就会返回这个 encodedData
    return `${esModule ? 'export default' : 'module.exports ='} ${JSON.stringify(encodedData)}`;
  } // Normalize the fallback. 使退路正常化

  // 走到这一步，表示不要将模块资源转化为 DataURL，接下来使用替代加载程序(fallback)加载资源
  // 提取出后备加载器和传递给后备加载器的配置项
  const {
    loader: fallbackLoader, // 后备加载器 - 默认为 file-loader
    options: fallbackOptions // 传递给后备加载器的配置项
  } = (0, _normalizeFallback.default)(options.fallback, options); // Require the fallback. 需要撤退
  // eslint-disable-next-line global-require, import/no-dynamic-require

  // 加载后备加载器 loader 
  const fallback = require(fallbackLoader); // Call the fallback, passing a copy of the loader context. The copy has the query replaced. This way, the fallback 调用回退，传递加载程序上下文的副本。副本已替换查询。这样，就有了退路
  // loader receives the query which was intended for it instead of the query which was intended for url-loader. 加载器接收的是针对它的查询，而不是针对url加载器的查询


  // 根据当前 this，并添加一个 query 参数，创建 loader 执行上下文
  const fallbackLoaderContext = Object.assign({}, this, {
    query: fallbackOptions
  });
  return fallback.call(fallbackLoaderContext, content); // 执行这个后备加载器，将其执行结果返回出去
} // Loader Mode


const raw = true;
exports.raw = raw; // 接收 Buffer 资源