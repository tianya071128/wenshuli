/* @flow */

import { cached, extend, toObject } from 'shared/util';

// 将 style 字符串分隔成对象形式
export const parseStyleText = cached(function(cssText) {
  const res = {};
  const listDelimiter = /;(?![^(]*\))/g;
  const propertyDelimiter = /:(.+)/;
  cssText.split(listDelimiter).forEach(function(item) {
    if (item) {
      const tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return res;
});

// merge static and dynamic style data on the same vnode 在同一 vnode 上合并静态和动态样式数据
// 将指定 Vnode 的 style、staticStyle 合并成一个对象处理
function normalizeStyleData(data: VNodeData): ?Object {
  const style = normalizeStyleBinding(data.style); // 处理动态样式，合并成对象
  // static style is pre-processed into an object during compilation 静态样式在编译期间预处理为对象
  // and is always a fresh object, so it's safe to merge into it 并且始终是一个新对象，因此合并到其中是安全的
  // 如果存在 staticStyle 样式的话，在编译期间会将其编译成对象，那么进行对象合并是安全的
  return data.staticStyle ? extend(data.staticStyle, style) : style;
}

// normalize possible array / string values into Object 将可能的数组/字符串值规范化为对象
/**
 * 如果定义的 style 是 [{...}, {...}]（数组形式只考虑对象项，其他项不考虑） 'fontSize: 28px' {...} 合并成对象形式
 */
export function normalizeStyleBinding(bindingStyle: any): ?Object {
  // 如果是数组的话，合并成对象
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle); // 将数组每一项合并成一个对象
  }
  // 如果是字符串的话，合并成对象
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle);
  }
  return bindingStyle;
}

/**
 * parent component style should be after child's 父组件样式应位于子组件样式之后
 * so that parent component's style could override it 以便父组件的样式可以覆盖它
 * 合并 style 策略：
 *  1. 先提取出子组件的
 *  2. 在提取当前 Vnode
 *  3. 在提取父组件的
 *  4. 上述提取都是提取出对象，直接利用对象属性进行同属性覆盖，但是优先使用父组件的
 *   -> 例如：例如：<component1 style="fontSize: 12px"> -- 组件 component1 模板为 <component2 style="fontSize: 14px" /> -- 组件 component2 模板为 <div style="fontSize: 16px"></div>
 *      这样的话，作用到 div 元素 DOM 上就是 style="fontSize: 12px" -- 父组件优先级最高
 */
export function getStyle(vnode: VNodeWithData, checkChild: boolean): Object {
  const res = {};
  let styleData;

  /**
   * 在这里处理组件类型 Vnode，将组件类型 Vnode 的根元素(如果根元素又是一个组件，则递归查找)的 style 合并至 res 对象处理
   */
  if (checkChild /** 这个变量似乎是多余的，应该是在其他平台上使用的 */) {
    let childNode = vnode;
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode;
      if (
        childNode &&
        childNode.data &&
        (styleData = normalizeStyleData(childNode.data)) // 将 childNode 的 style 进行合并成对象处理
      ) {
        extend(res, styleData); // 合并进 res 对象中
      }
    }
  }

  // 将当前 Vnode 的 style 合并至 res 对象中
  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData);
  }

  /**
   * 在这里处理的是父组件，将父组件的 style 合并至 res 中
   */
  let parentNode = vnode;
  // parentNode.parent：组件模板的根 Vnode
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData);
    }
  }
  return res;
}
