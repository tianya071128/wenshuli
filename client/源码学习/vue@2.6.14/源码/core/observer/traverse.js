/* @flow */
// 此文件是解决 watcher 的 deep 深度监听问题

import { _Set as Set, isObject } from '../util/index';
import type { SimpleSet } from '../util/index';
import VNode from '../vdom/vnode';

// 用于解决循环引用的问题
const seenObjects = new Set();

/**
 * Recursively traverse an object to evoke all converted 递归遍历对象以调用所有已转换的
 * getters, so that every nested property inside the object / getter，以便对象中的每个嵌套属性
 * is collected as a "deep" dependency. 作为“深度”依赖项收集
 * Wathcer 的 deep 选项，深度监听
 */
export function traverse(val: any) {
  _traverse(val, seenObjects); // 使用 _traverse 实现
  seenObjects.clear(); // 清空 Set 集合
}

// 深度监听逻辑：遍历数组或对象，触发读取属性操作即可
function _traverse(val: any, seen: SimpleSet) {
  let i, keys;
  const isA = Array.isArray(val); // 是否为数组
  // 以下几种情况，直接退出
  if (
    (!isA && !isObject(val)) || // 不是数组，并且不是对象
    Object.isFrozen(val) || // 冻结的对象
    val instanceof VNode // 是 VNode 的实例
  ) {
    return;
  }
  // 存在 __ob__ 属性，表示该 val 已经响应式了的
  if (val.__ob__) {
    // 找出该 val 的 depID，防止循环引用
    const depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      // 如果该 DepID 存在，则说明是循环引用，此时返回
      return;
    }
    seen.add(depId); // 推入到 seen 集合中
  }
  if (isA) {
    /** 数组 */ i = val.length;
    // 遍历数组 - 数组 val[i] 读取是没有办法拦截的，但我们一般需要关注数组项的值
    while (i--) _traverse(val[i], seen);
  } /** 其他情况 */ else {
    keys = Object.keys(val);
    i = keys.length;
    // 遍历对象
    while (i--)
      _traverse(val[keys[i]] /** 在这里读取了属性，就会触发依赖收集 */, seen);
  }
}
