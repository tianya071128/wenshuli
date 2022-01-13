/* @flow */

/**
 * unicode letters used for parsing html tags, component names and property paths. 用于解析html标记、组件名称和属性路径的unicode字母
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname 使用 https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS 正在跳过\u10000-\uEFFFF，因为它冻结了PhantomJS
 */
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * Check if a string starts with $ or _ 检查字符串是否以 $ 或者 _ 开头
 */
export function isReserved(str: string): boolean {
  const c = (str + '').charCodeAt(0);
  return c === 0x24 || c === 0x5f;
}

/**
 * Define a property. 定义属性
 * 通过 Object.defineProperty 添加一个属性
 */
export function def(obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable, // 是否可枚举
    writable: true,
    configurable: true,
  });
}

/**
 * Parse simple path. 解析简单路径
 * 如果 watcher 表达式是 a.b.c 字符串类型，则封装成对象读取的函数，用于触发依赖收集
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
export function parsePath(path: string): any {
  // path 不符合条件
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split('.'); // 以 . 分隔
  // 返回封装的函数
  return function(obj /** 一般而言是 vm 实例 */) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return; // 如果 obj 不存在，则直接退出函数执行
      obj = obj[segments[i]]; // 否则访问一下对象，这样就会触发依赖收集了
    }
    return obj; // 返回最后的取值
  };
}
