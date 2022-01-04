/*
 * not type checking this file because flow doesn't play well with 不检查此文件的类型，因为flow不能很好地使用
 * dynamically accessing methods on Array prototype 阵列原型的动态访问方法
 * 重写数组访问方法操作
 */

import { def } from '../util/index';

const arrayProto = Array.prototype; // Array.prototype 原型对象
export const arrayMethods = Object.create(arrayProto); // 创建一个原型为 arrayProto 的对象

// 只有下面的数组方法我们才需要拦截，下面的方法都有一个共同点就是会改变原数组
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
];

/**
 * Intercept mutating methods and emit events 截获变异方法并发出事件
 */
methodsToPatch.forEach(function(method) {
  // cache original method 缓存原始方法
  const original = arrayProto[method];
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args); // 首先调用原始方法
    const ob = this.__ob__; // 提取出 __ob__ 引用
    let inserted;
    // push、unshift、splice 方法会新增数组项
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break;
      case 'splice':
        inserted = args.slice(2);
        break;
    }
    // 我们需要将新增的数组项也响应式一下，原数组项已经处理了的就不需要处理了
    if (inserted) ob.observeArray(inserted);
    // notify change 通知变更
    // 在这里就会用到 __ob__.dep 引用，表示观察这个数组的所有 watcher 类，触发依赖更新
    ob.dep.notify();
    return result; // 返回结果值
  });
});
