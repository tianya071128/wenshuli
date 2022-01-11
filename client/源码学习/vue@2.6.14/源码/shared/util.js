/* @flow */
// 空的冻结对象
export const emptyObject = Object.freeze({});

// These helpers produce better VM code in JS engines due to their 这些帮助程序在JS引擎中生成更好的VM代码，因为它们的
// explicitness and function inlining. 明确性与函数内联
// 检测是否为 undefined 或 null
export function isUndef(v: any): boolean %checks {
  return v === undefined || v === null;
}

// 检测指定数据不为 null 或 undefined
export function isDef(v: any): boolean %checks {
  return v !== undefined && v !== null;
}

// 检测指定值是否为 true
export function isTrue(v: any): boolean %checks {
  return v === true;
}

export function isFalse(v: any): boolean %checks {
  return v === false;
}

/**
 * Check if value is primitive. 检查值是否为原始值(string、number、symbol、boolean)
 */
export function isPrimitive(value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  );
}

/**
 * Quick object check - this is primarily used to tell 快速对象检查-主要用于告知
 * Objects from primitive values when we know the value 当我们知道原始值时，从原始值中删除对象
 * is a JSON-compliant type. 是符合JSON的类型
 */
export function isObject(obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object';
}

/**
 * Get the raw type string of a value, e.g., [object Object]. 获取值的原始类型字符串，例如 [object Object]
 */
const _toString = Object.prototype.toString;

// 返回指定数据类型值
export function toRawType(value) {
  return _toString.call(value).slice(8, -1);
}

/**
 * Strict object type check. Only returns true 严格的对象类型检查。只返回true
 * for plain JavaScript objects.  对于普通JavaScript对象
 * 检测是否为严格对象
 */
export function isPlainObject(obj) {
  return _toString.call(obj) === '[object Object]';
}

// 检测是否为正则表达式
export function isRegExp(v) {
  return _toString.call(v) === '[object RegExp]';
}

/**
 * Check if val is a valid array index.
 */
export function isValidArrayIndex(val: any): boolean {
  const n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && isFinite(val);
}

// 检测指定值是否支持 Promise 类型，如果返回对象具有 then、catch 方法
export function isPromise(val: any): boolean {
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  );
}

/**
 * Convert a value to a string that is actually rendered.
 */
export function toString(val: any): string {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
    ? JSON.stringify(val, null, 2)
    : String(val);
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */
export function toNumber(val: string): number | string {
  const n = parseFloat(val);
  return isNaN(n) ? val : n;
}

/**
 * Make a map and return a function for checking if a key 制作一个映射并返回一个函数，用于检查是否存在一个键
 * is in that map. 在这 map 上。
 */
export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  // str 是以 , 分隔的字符串，这些项表示需要检测的范围
  const map = Object.create(null);
  const list: Array<string> = str.split(',');
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  // 返回一个检测函数
  return expectsLowerCase ? (val) => map[val.toLowerCase()] : (val) => map[val];
}

/**
 * Check if a tag is a built-in tag. 检查标记是否为内置标记
 */
export const isBuiltInTag = makeMap('slot,component', true);

/**
 * Check if an attribute is a reserved attribute. 检查属性是否为保留属性 key,ref,slot,slot-scope,is
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

/**
 * Remove an item from an array. 从数组中删除项
 */
export function remove(arr: Array<any>, item: any): Array<any> | void {
  // 遍历数组，找到 item 项所在索引，删除即可
  if (arr.length) {
    const index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1);
    }
  }
}

/**
 * Check whether an object has the property. 检查对象是否具有该属性
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;
// 检测 key 是否为 obj 的属性(不从原型链继承)
export function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}

/**
 * Create a cached version of a pure function. 创建纯函数的缓存版本
 */
export function cached(fn) {
  // 利用闭包，创建一个缓存对象
  const cache = Object.create(null);
  return function cachedFn(str) {
    const hit = cache[str]; // 将结果值进行缓存
    return hit || (cache[str] = fn(str)); // 如果存在缓存，那么直接将缓存值返回即可
  };
}

/**
 * Camelize a hyphen-delimited string. 对以连字符分隔的字符串进行Camelize
 * 将 - 分隔字符串改成驼峰字符串，例如：demo-test => demoTest
 */
const camelizeRE = /-(\w)/g;
export const camelize = cached((str) => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});

/**
 * Capitalize a string. 将字符串大写
 * 字符串首字母大写
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/**
 * Hyphenate a camelCase string. 将camelCase字符串连字符
 * 将驼峰命名转化为以 - 分隔的字符串
 */
const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase();
});

/**
 * Simple bind polyfill for environments that do not support it, 简单绑定polyfill，适用于不支持它的环境
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore 例如 PhantomJS 1.x。从技术上讲，我们不再需要这个了
 * since native bind is now performant enough in most browsers. 因为在大多数浏览器中，本机绑定的性能已经足够了。
 * But removing it would mean breaking code that was able to run in 但删除它意味着破坏能够在中运行的代码
 * PhantomJS 1.x, so this must be kept for backward compatibility. PhantomJS 1.x, 因此，为了向后兼容，必须保留此项
 */

/* istanbul ignore next */
function polyfillBind(fn: Function, ctx: Object): Function {
  function boundFn(a) {
    const l = arguments.length;
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx);
  }

  boundFn._length = fn.length;
  return boundFn;
}

function nativeBind(fn: Function, ctx: Object): Function {
  return fn.bind(ctx);
}

// bind，如果不支持， polyfill 一下
export const bind = Function.prototype.bind ? nativeBind : polyfillBind;

/**
 * Convert an Array-like object to a real Array.
 */
export function toArray(list: any, start?: number): Array<any> {
  start = start || 0;
  let i = list.length - start;
  const ret: Array<any> = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret;
}

/**
 * Mix properties into target object. 将属性混合到目标对象中
 */
export function extend(to: Object, _from: ?Object): Object {
  // 方法浅合并
  for (const key in _from) {
    to[key] = _from[key];
  }
  return to;
}

/**
 * Merge an Array of Objects into a single Object.
 */
export function toObject(arr: Array<any>): Object {
  const res = {};
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i]);
    }
  }
  return res;
}

/* eslint-disable no-unused-vars */

/**
 * 空函数
 * Perform no operation. 不做手术
 * Stubbing args to make Flow happy without leaving useless transpiled code stubing args使流愉快，而不留下无用的传输代码
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop(a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 */
export const no = (a?: any, b?: any, c?: any) => false;

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 */
export const identity = (_: any) => _;

/**
 * Generate a string containing static keys from compiler modules.
 */
export function genStaticKeys(modules: Array<ModuleOptions>): string {
  return modules
    .reduce((keys, m) => {
      return keys.concat(m.staticKeys || []);
    }, [])
    .join(',');
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
export function looseEqual(a: any, b: any): boolean {
  if (a === b) return true;
  const isObjectA = isObject(a);
  const isObjectB = isObject(b);
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a);
      const isArrayB = Array.isArray(b);
      if (isArrayA && isArrayB) {
        return (
          a.length === b.length &&
          a.every((e, i) => {
            return looseEqual(e, b[i]);
          })
        );
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        return (
          keysA.length === keysB.length &&
          keysA.every((key) => {
            return looseEqual(a[key], b[key]);
          })
        );
      } else {
        /* istanbul ignore next */
        return false;
      }
    } catch (e) {
      /* istanbul ignore next */
      return false;
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b);
  } else {
    return false;
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */
export function looseIndexOf(arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i;
  }
  return -1;
}

/**
 * Ensure a function is called only once.
 */
export function once(fn: Function): Function {
  let called = false;
  return function() {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  };
}
