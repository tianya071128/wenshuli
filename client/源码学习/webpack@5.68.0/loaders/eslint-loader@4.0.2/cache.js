"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _os = _interopRequireDefault(require("os"));

var _path = require("path");

var _util = require("util");

var _zlib = _interopRequireDefault(require("zlib"));

var _crypto = require("crypto");

var _findCacheDir = _interopRequireDefault(require("find-cache-dir"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Original Filesystem Cache implementation by babel-loader
 * Licensed under the MIT License
 *
 * @see https://github.com/babel/babel-loader/commits/master/src/fs-cache.js
 * @see https://github.com/babel/babel-loader/commits/master/src/cache.js
 */

/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
// Lazily instantiated when needed 在需要时懒洋洋地实例化
let defaultCacheDirectory = null; // 默认缓存写入位置(./node_modules/.cache 目录) - 惰性求值，只求一次值
const readFile = (0, _util.promisify)(_fs.default.readFile);
const writeFile = (0, _util.promisify)(_fs.default.writeFile);
const gunzip = (0, _util.promisify)(_zlib.default.gunzip);
const gzip = (0, _util.promisify)(_zlib.default.gzip);

/**
 * Read the contents from the compressed file. 从压缩文件中读取内容
 * 
 * @async
 * @params {String} filename 文件路径 
 * @params {Boolean} compress 缓存文件是否被压缩
 */
const read = async (filename, compress) => {
  const data = await readFile(filename + (compress ? '.gz' : '')); // 尝试读取缓存文件
  const content = compress ? await gunzip(data) : data; // 如果是压缩文件，进行解压
  return JSON.parse(content.toString());
};

/**
 * Write contents into a compressed file. 将内容写入压缩文件
 * @async
 * @params {String} filename 写入文件名
 * @params {Boolean} compress 是否压缩
 * @params {String} result 写入内容
 */
const write = async (filename, compress, result) => {
  const content = JSON.stringify(result);
  const data = compress ? await gzip(content) : content;
  return writeFile(filename + (compress ? '.gz' : ''), data);
};

/**
 * Build the filename for the cached file 生成缓存文件的文件名
 *
 * @params {String} source  File source code 文件源代码
 * @params {String} identifier 缓存标识符
 * @params {Object} options Options used loader 配置项
 *
 * @return {String}
 */
const filename = (source, identifier, options) => {
  const hash = (0, _crypto.createHash)('md4'); 
  const contents = JSON.stringify({
    source,
    options,
    identifier
  });
  hash.update(contents);
  return `${hash.digest('hex')}.json`;
};

/**
 * Handle the cache 处理缓存
 *
 * @params {String} directory 目录
 * @params {Object} params 参数
 */
const handleCache = async (directory, params) => {
  const {
    source, // 要缓存的文件的原始内容
    options = {}, // 要为转换fn提供的选项 - loader 配置项
    transform, // 函数将转换函数将转换
    cacheIdentifier, // 缓存的唯一标识符
    cacheDirectory, // 用户定义的用于存储缓存文件的目录(如果存在的话)
    cacheCompression // 是否压缩缓存结果
  } = params;
  // filename(source, cacheIdentifier, options)：根据这几个信息，生成一个 [hash].json
  // 结合缓存目录，组装成一个缓存路径：C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\.cache\\eslint-loader\\0cb6a16786e51bb351dd01ba6abfd494.json
  const file = (0, _path.join)(directory, filename(source, cacheIdentifier, options));

  try {
    // No errors mean that the file was previously cached 没有错误意味着该文件以前已缓存
    // we just need to return it 我们只需要归还它
    // 如果读取到了 file 路径文件，则表示存在这个文件，意味着已经被缓存，则返回缓存结果即可
    return await read(file, cacheCompression); // eslint-disable-next-line no-empty
  } catch (err) {}

  const fallback = typeof cacheDirectory !== 'string' && directory !== _os.default.tmpdir();

   // Make sure the directory exists. 确保目录存在
  try {
    // mkdirSync：同步地创建目录
    _fs.default.mkdirSync(directory, {
      recursive: true
    });
  } catch (err) {
    // 如果创建失败，并且是创建用户自定义的目录时
    if (fallback) {
      // 那么重新尝试默认目录写入缓存
      return handleCache(_os.default.tmpdir(), params);
    }

    // 如果是默认目录都出错的话，则抛出错误
    throw err;
  }

  // Otherwise just transform the file 否则，只需转换文件即可
  // return it to the user asap and write it in cache 尽快将其返回给用户，并将其写入缓存
  const result = await transform(source, options);

  try {
    // 在这里就将其检查结果进行缓存输出到缓存目录中
    await write(file, cacheCompression, result);
  } catch (err) {
    if (fallback) {
      // Fallback to tmpdir if node_modules folder not writable 如果节点_模块文件夹不可写，则返回tmpdir
      return handleCache(_os.default.tmpdir(), params);
    }

    throw err;
  }

  return result;
};
/**
 * Retrieve file from cache, or create a new one for future reads 从缓存中检索文件，或创建一个新文件以供将来读取
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.cacheDirectory  Directory to store cached files 用于存储缓存文件的目录 - 用户定义的用于存储缓存文件的目录(如果存在的话)
 * @param  {String}   params.cacheIdentifier Unique identifier to bust cache bust缓存的唯一标识符
 * @param  {Boolean}  params.cacheCompression 是否压缩缓存结果
 * @param  {String}   params.source   Original contents of the file to be cached 要缓存的文件的原始内容
 * @param  {Object}   params.options  Options to be given to the transform fn 要为转换fn提供的选项 - loader 配置项
 * @param  {Function} params.transform  Function that will transform the  函数将转换函数将转换
 *                                      original file and whose result will be 原始文件，其结果将是
 *                                      cached 缓存
 *
 * @example 例子
 *
 *   cache({
 *     cacheDirectory: '.tmp/cache',
 *     cacheIdentifier: 'babel-loader-cachefile',
 *     cacheCompression: true,
 *     source: *source code from file*,
 *     options: {
 *       experimental: true,
 *       runtime: true
 *     },
 *     transform: function(source, options) {
 *       var content = *do what you need with the source*
 *       return content;
 *     }
 *   });
 */


module.exports = async params => {
  let directory; // 缓存文件目录

  if (typeof params.cacheDirectory === 'string') {
    // 如果 options.cache 定义为 string，使用用户指定的缓存目录
    directory = params.cacheDirectory;
  } else {
    // 其他情况，则去默认值，在一次编译中，只求一次值
    if (defaultCacheDirectory === null) {
      // C:\\Users\\Administrator\\Desktop\\wenshuli\\client\\demo\\webpack\\02_loader\\node_modules\\.cache\\eslint-loader
      defaultCacheDirectory = (0, _findCacheDir.default)({
        name: 'eslint-loader'
      }) || _os.default.tmpdir();
    }

    directory = defaultCacheDirectory;
  }

  return handleCache(directory, params); // 处理缓存
};