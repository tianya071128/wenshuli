/* @flow */

import type Watcher from './watcher';
import { remove } from '../util/index';
import config from '../config';

let uid = 0;

/**
 * A dep is an observable that can have multiple dep是一个可观察的，可以有多个
 * directives subscribing to it. 订阅它的指令
 * Dep 类可以看成是一个依赖项收集器，收集 watcher，并在属性改变时触发 watcher 更新
 */
export default class Dep {
  static target: ?Watcher; // 静态属性，引用当前观察的 Wathcer 类
  id: number;
  subs: Array<Watcher>;

  constructor() {
    this.id = uid++; // id
    this.subs = []; // 依赖集合
  }

  // 添加观察者 Wathcer
  addSub(sub: Watcher) {
    this.subs.push(sub); // 推入集合中，不需要判断是否重复，因为在 Wathcer 已经判断重复问题了的
  }

  // 删除观察者 Wathcer
  removeSub(sub: Watcher) {
    remove(this.subs, sub); // 从 subs 集合中删除该 Wathcer
  }

  // 添加观察者 - 需要先让 Wathcer 添加该 Dep 后在添加 Wathcer 类
  depend() {
    // 如果存在 watcher 类的话
    if (Dep.target) {
      Dep.target.addDep(this); // 通过 watcher 的 addDep 添加
    }
  }

  // 触发观察者
  notify() {
    // stabilize the subscriber list first 首先稳定订户列表
    const subs = this.subs.slice(); // 订阅者副本
    // 如果是开发环境 && 是同步执行的话，我们在这里就需要对 subs 订阅者进行排序，让 Wathcer 有序执行 - id 越小(表示越早定义，一般而言渲染函数最后执行)先执行
    // config.async：属性变更时同步执行观察者 Wathcer，一般不会这样做，性能太低了
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async 如果未运行异步，则不会在调度程序中对子对象进行排序
      // we need to sort them now to make sure they fire in correct 我们现在需要对它们进行分类，以确保它们正确开火
      // order 命令
      subs.sort((a, b) => a.id - b.id); // 升序
    }
    // 遍历，通知 Wathcer 类依赖变更了
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}

// The current target watcher being evaluated. 正在评估的当前目标监视程序
// This is globally unique because only one watcher 这是全局唯一的，因为只有一个观察者
// can be evaluated at a time. 可以一次评估
Dep.target = null;
const targetStack = []; // 观察者 watcher 的栈集合

// 推入需要观察的 Wathcer 类
export function pushTarget(target: ?Watcher) {
  targetStack.push(target);
  Dep.target = target; // 更改引用
}

// 推出 Wathcer 类
export function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1]; // 更新引用
}
