"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

let babel;

try {
  babel = require("@babel/core"); // 加载 babel 程序
} catch (err) {
  if (err.code === "MODULE_NOT_FOUND") {
    // babel-loader@8 需要 Babel 7.x(包'@babel/core')，如果你想使用 babel 6.x('babel-core')，你应该安装 'babel-loader@7'
    err.message += "\n babel-loader@8 requires Babel 7.x (the package '@babel/core'). " + "If you'd like to use Babel 6.x ('babel-core'), you should install 'babel-loader@7'.";
  }

  throw err;
}
// Since we've got the reverse bridge package at @babel/core@6.x, give 因为我们已经在 @babel/core@6.x 获得了反向桥包，所以请给予
// people useful feedback if they try to use it alongside babel-loader. 人们有用的反馈，如果他们试图使用它与  babel loader

// 如果 babel 的版本是 6.x 给出提示
if (/^6\./.test(babel.version)) {
  throw new Error("\n babel-loader@8 will not work with the '@babel/core@6' bridge package. " + "If you want to use Babel 6.x, install 'babel-loader@7'.");
}

const {
  version
} = require("../package.json"); // 当前 babel-loader 版本

const cache = require("./cache");

const transform = require("./transform");

const injectCaller = require("./injectCaller");

const schema = require("./schema");

const {
  isAbsolute
} = require("path");

const loaderUtils = require("loader-utils");

const validateOptions = require("schema-utils");

function subscribe(subscriber, metadata, context) {
  if (context[subscriber]) {
    context[subscriber](metadata);
  }
}

module.exports = makeLoader();
module.exports.custom = makeLoader; // 自定义 loader

function makeLoader(callback) {
  const overrides = callback ? callback(babel) : undefined;
  return function (source, inputSourceMap) {
    // Make the loader async 使加载器异步
    const callback = this.async(); // 异步 loader
    loader.call(this, source, inputSourceMap, overrides).then(args => callback(null, ...args), err => callback(err));
  };
}

function loader(_x, _x2, _x3) {
  return _loader.apply(this, arguments);
}

function _loader() {
  _loader = _asyncToGenerator(function* (source/** 要编译的源码 */, inputSourceMap /** 上一个 loader 处理的 sourceMap */, overrides) {
    const filename = this.resourcePath; // 处理模块的绝对路径
    let loaderOptions = loaderUtils.getOptions(this) || {}; // 获取传递给 babel-loader 的配置项
    // 验证配置项
    validateOptions(schema, loaderOptions, {
      name: "Babel loader"
    });

    // 自定义 loader 的问题 - 略过
    if (loaderOptions.customize != null) {
      if (typeof loaderOptions.customize !== "string") {
        throw new Error("Customized loaders must be implemented as standalone modules.");
      }

      if (!isAbsolute(loaderOptions.customize)) {
        throw new Error("Customized loaders must be passed as absolute paths, since " + "babel-loader has no way to know what they would be relative to.");
      }

      if (overrides) {
        throw new Error("babel-loader's 'customize' option is not available when already " + "using a customized babel-loader wrapper.");
      }

      let override = require(loaderOptions.customize);

      if (override.__esModule) override = override.default;

      if (typeof override !== "function") {
        throw new Error("Custom overrides must be functions.");
      }

      overrides = override(babel);
    }

    let customOptions;

    // 自定义 loader 的问题 - 略过
    if (overrides && overrides.customOptions) {
      const result = yield overrides.customOptions.call(this, loaderOptions, {
        source,
        map: inputSourceMap
      });
      customOptions = result.custom;
      loaderOptions = result.loader;
    } // Deprecation handling

    // 废弃配置项提示
    if ("forceEnv" in loaderOptions) {
      // 在 Babel 7 中，“forceEnv” 选项被移除，取而代之的是 “envName”。
      console.warn("The option `forceEnv` has been removed in favor of `envName` in Babel 7.");
    }

    // 废弃配置项提示
    if (typeof loaderOptions.babelrc === "string") {
      // 选项' babelrc '不应该再设置为一个字符串在babel加载配置。" + "请更新您的配置并设置' babelrc '为true或false。如果你想指定一个特定的babel配置文件从+继承配置，请使用' extends '选项。有关此选项的详细信息，请参见
      console.warn("The option `babelrc` should not be set to a string anymore in the babel-loader config. " + "Please update your configuration and set `babelrc` to true or false.\n" + "If you want to specify a specific babel config file to inherit config from " + "please use the `extends` option.\nFor more information about this options see " + "https://babeljs.io/docs/core-packages/#options");
    }

    // Standardize on 'sourceMaps' as the key passed through to Webpack, so that 标准化'source Maps'作为键传递到Webpack，因此
    // users may safely use either one alongside our default use of 用户可以安全地使用我们的默认使用
    // 'this.sourceMap' below without getting error about conflicting aliases. 'this.sourceMap' 下面没有得到错误的冲突别名。
    if (Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMap") && !Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMaps")) {
      // 在 babel7 中，sourceMap 已被 sourceMaps 配置项代替
      loaderOptions = Object.assign({}, loaderOptions, {
        sourceMaps: loaderOptions.sourceMap
      });
      delete loaderOptions.sourceMap;
    }

    // 添加一些 babel 的编程配置项进去 -- https://www.babeljs.cn/docs/options#primary-options
    const programmaticOptions = Object.assign({}, loaderOptions, {
      filename, // 与当前正在编译的代码关联的文件名（如果有）
      inputSourceMap: inputSourceMap || undefined, // 如果文件本身包含/#sourceMappingURL=。。。
      // Set the default sourcemap behavior based on Webpack's mapping flag, 根据Webpack的映射标志设置默认的源映射行为
      // but allow users to override if they want. 但如果用户愿意，允许他们重写
      // 如果用户配置了 babel-loader 的 sourceMaps，则由用户决定，否则就让 webpack 决定是否生成 sourceMap
      sourceMaps: loaderOptions.sourceMaps === undefined ? this.sourceMap : loaderOptions.sourceMaps,
      // Ensure that Webpack will get a full absolute path in the sourcemap 确保Webpack将在源地图中获得完整的绝对路径
      // so that it can properly map the module back to its internal cached 这样它就可以正确地将模块映射回它的内部缓存
      // modules. 模块
      sourceFileName: filename // 用于源映射对象内的文件的名称。
    });

    // Remove loader related options 删除 loader 相关选项
    // programmaticOptions 是传递给 babel 程序的，而下面这些配置项是 babel-loader 独有的
    delete programmaticOptions.customize;
    delete programmaticOptions.cacheDirectory;
    delete programmaticOptions.cacheIdentifier;
    delete programmaticOptions.cacheCompression;
    delete programmaticOptions.metadataSubscribers;

    if (!babel.loadPartialConfig) {
      // babel-loader ^8.0.0-beta.3 需要加载 @babel/core@7.0.0-beta.41，但是你似乎在使用“${babel.version}
      // 要么更新你的 @babel/core 版本，要么锁定你的 babel-loader 版本到 8.0.0-beta.2
      throw new Error(`babel-loader ^8.0.0-beta.3 requires @babel/core@7.0.0-beta.41, but ` + `you appear to be using "${babel.version}". Either update your ` + `@babel/core version, or pin you babel-loader version to 8.0.0-beta.2`);
    }
    
    // babel.loadPartialConfigAsync is available in v7.8.0+ babel.loadPartialConfigAsync 在 v7.8.0+ 中可以使用
    const {
      loadPartialConfigAsync = babel.loadPartialConfig
    } = babel;
    /**
     * injectCaller：添加 caller 配置项(如果支持的话)
     * 
     * loadPartialConfigAsync 方法：为了使系统能够轻松地操作和验证用户的配置，此函数解析插件和预置，不再继续。我们的期望是，调用者将使用config.options，在他们认为合适的时候操作它，并再次将其传递回Babel。
     *                              简单理解就是读取配置文件，并合并传入的 options(injectCaller(programmaticOptions, this.target))，最终得到配置项
     * 注意：这个方法返回的配置项会添加如下配置项(即使自身配置了这几个配置项)：
     *      -> browserslistConfigFile: false --> 不会搜索 Browserslist 配置源
     *      -> babelrc: false --> 禁用 。babelrc 配置文件
     *      -> configFile: false --> 禁用 babel.config.js 配置文件
     *    这样的话，babel.transform 进行转换时不会再去搜索配置文件进行配置合并的工作，而直接使用现在的配置信息
     */
    const config = yield loadPartialConfigAsync(injectCaller(programmaticOptions, this.target));

    if (config) {
      let options = config.options; // 合并后的 babel 配置项

      // 自定义 loader 问题 - 略过
      if (overrides && overrides.config) {
        options = yield overrides.config.call(this, config, {
          source,
          map: inputSourceMap,
          customOptions
        });
      }

      // 改写 sourceMap 为 true
      if (options.sourceMaps === "inline") {
        // Babel has this weird behavior where if you set "inline", we Babel有一个奇怪的行为，如果你设置“内联”，我们
        // inline the sourcemap, and set 'result.map = null'. This results 内联的源地图，并设置'result.map = null'。这个结果
        // in bad behavior from Babel since the maps get put into the code, 在Babel的不良行为中，因为地图被放到了代码中
        // which Webpack does not expect, and because the map we return to 哪个Webpack不期望，因为我们返回的地图
        // Webpack is null, which is also bad. To avoid that, we override the Webpack是空的，这也不好。为了避免这种情况，我们重写
        // behavior here so "inline" just behaves like 'true'. 这里"inline"的行为就像" true
        options.sourceMaps = true;
      }

      const {
        cacheDirectory = null, // 当有设置时，指定的目录将用来缓存 loader 的执行结果。之后的 webpack 构建，将会尝试读取缓存，来避免在每次执行时，可能产生的、高性能消耗的 Babel 重新编译过程(recompilation process)。
        // 缓存标识符，根据这几个标识，可以保证针对同一源码编译会产生相同的结果 -- 可以设置为一个自定义的值，在 identifier 改变后，来强制缓存失效。
        cacheIdentifier = JSON.stringify({
          options, // 合并后的 babel 配置项
          "@babel/core": transform.version, // babel 版本号
          "@babel/loader": version // babel-loader 版本号
        }),
        cacheCompression = true, // 当设置此值时，会使用 Gzip 压缩每个 Babel transform 输出。
        metadataSubscribers = [] // 。。。 
      } = loaderOptions; // 从 babel-loader 的配置项中提取数据，这是 babel-loader 独有的配置项
      let result;

      // 需要进行缓存的话(文件系统层面的缓存)
      if (cacheDirectory) {
        result = yield cache({
          source,
          options,
          transform,
          cacheDirectory,
          cacheIdentifier,
          cacheCompression
        });
      } else {
        // 不进行缓存，直接进行转译
        result = yield transform(source, options);
      }

      // Availabe since Babel 7.12 自 Babel 7.12 起生效
      // https://github.com/babel/babel/pull/11907
      // config.files：构建配置项而读取的文件路径，包括项目范围的配置文件、本地配置文件、扩展配置文件、忽略文件等。对于实现监视模式或缓存失效很有用。
      if (config.files) {
        // addDependency：加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到。
        config.files.forEach(configFile => this.addDependency(configFile));
      } else {
        // 如果不支持 files 文件，则从其他属性中获取配置文件信息
        // .babelrc.json
        if (typeof config.babelrc === "string") {
          this.addDependency(config.babelrc);
        } // babel.config.js


        if (config.config) {
          this.addDependency(config.config);
        }
      }

      // 存在结果值
      if (result) {
        // 自定义 loader 处理
        if (overrides && overrides.result) {
          result = yield overrides.result.call(this, result, {
            source,
            map: inputSourceMap,
            customOptions,
            config,
            options
          });
        }

        const {
          code, // 转译后的内容 
          map, // sourceMap 信息
          metadata
        } = result;
        metadataSubscribers.forEach(subscriber => {
          subscribe(subscriber, metadata, this);
        });
        return [code, map]; // 返回数据
      }
    }
    
    // If the file was ignored, pass through the original content. 如果文件被忽略，则传递原始内容
    return [source, inputSourceMap];
  });
  return _loader.apply(this, arguments);
}