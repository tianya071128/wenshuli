/* @flow */

// can we use __proto__? 我们能用proto吗__
export const hasProto = '__proto__' in {};

// Browser environment sniffing 浏览器环境嗅探
export const inBrowser = typeof window !== 'undefined'; // 是否为浏览器环境
export const inWeex =
  typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform; // 是否为 Weex 环境
export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
export const UA = inBrowser && window.navigator.userAgent.toLowerCase(); // UA 标识
export const isIE = UA && /msie|trident/.test(UA); // 不是 IE 浏览器
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0;
export const isEdge = UA && UA.indexOf('edge/') > 0;
export const isAndroid =
  (UA && UA.indexOf('android') > 0) || weexPlatform === 'android';
export const isIOS =
  (UA && /iphone|ipad|ipod|ios/.test(UA)) || weexPlatform === 'ios';
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
export const isPhantomJS = UA && /phantomjs/.test(UA);
export const isFF = UA && UA.match(/firefox\/(\d+)/);

// Firefox has a "watch" function on Object.prototype... Firefox在对象上有一个“监视”功能。原型
export const nativeWatch = {}.watch;

export let supportsPassive = false;
if (inBrowser) {
  try {
    const opts = {};
    Object.defineProperty(
      opts,
      'passive',
      ({
        get() {
          /* istanbul ignore next */
          supportsPassive = true;
        },
      }: Object)
    ); // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts);
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before 这需要延迟评估，因为之前可能需要vue
// vue-server-renderer can set VUE_ENV vue-server-renderer 可以设置 VUE_ENV
let _isServer;
// 判断是否为服务端渲染
export const isServerRendering = () => {
  // 如果没有判断过，因为会延迟判断
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (
      !inBrowser /** 不是浏览器环境 */ &&
      !inWeex /** 不是 Weex 环境 */ &&
      typeof global !== 'undefined' /** global 不是 undefined */
    ) {
      // detect presence of vue-server-renderer and avoid 检测vue服务器呈现程序的存在并避免
      // Webpack shimming(预置依赖) the process Webpack 预置依赖的过程
      _isServer =
        global['process'] && global['process'].env.VUE_ENV === 'server'; // 如果是服务端渲染，那么会添加一个环境变量
    } else {
      _isServer = false;
    }
  }
  return _isServer;
};

// detect devtools 检测devtools
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__; // 通过是否在 window 上注入 __VUE_DEVTOOLS_GLOBAL_HOOK__ 对象

/* istanbul ignore next */
// 判断指定值是否为原生函数，例如：Array、String 等
export function isNative(Ctor) {
  // 如果是原生值的话，那么 Ctor 构造函数就会存在 native code
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString());
}

// 是否支持 Symbol 环境并且支持 Reflect
export const hasSymbol =
  typeof Symbol !== 'undefined' && // 支持 Symbol
  isNative(Symbol) && // 并且 Symbol 是原生函数
  typeof Reflect !== 'undefined' &&
  isNative(Reflect.ownKeys);

let _Set; // $flow-disable-line
/* istanbul ignore if */ if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set;
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = class Set implements SimpleSet {
    set: Object;
    constructor() {
      this.set = Object.create(null);
    }
    has(key: string | number) {
      return this.set[key] === true;
    }
    add(key: string | number) {
      this.set[key] = true;
    }
    clear() {
      this.set = Object.create(null);
    }
  };
}

export interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}

export { _Set };
