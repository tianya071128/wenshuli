/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop,
} from '../util/index';

import { traverse } from './traverse';
import { queueWatcher } from './scheduler';
import Dep, { pushTarget, popTarget } from './dep';

import type { SimpleSet } from '../util/index';

let uid = 0;

/**
 * A watcher parses an expression, collects dependencies, 观察者解析表达式，收集依赖项
 * and fires callback when the expression value changes. 并在表达式值更改时激发回调
 * This is used for both the $watch() api and directives. 这用于 $watch（）api和指令
 */
export default class Watcher {
  vm: Component; // 组件实例
  expression: string; // 解析表达式的字符串表示 - 用于报错提示
  cb: Function; // 解析后执行回调
  id: number; // wathcer id
  deep: boolean; // 是否深度侦听
  user: boolean; // 开发者定义的 wathcer -- 可能是通过 watch 选项或者 $watch api
  lazy: boolean; // 惰性 wathcer -- 在计算属性中会使用
  sync: boolean;
  dirty: boolean;
  active: boolean; // 是否为激活状态
  deps: Array<Dep>; // 当前 wathcer 依赖项
  newDeps: Array<Dep>; // 更新后 watcher 依赖项 - 用于比较更新前后的依赖项后清除无用依赖项
  depIds: SimpleSet; // 依赖项 id
  newDepIds: SimpleSet; // 更新后 watcher 依赖项 id
  before: ?Function; // 解析表达式之前的钩子函数
  getter: Function; // 需要解析的表达式，是一个函数，在函数执行过程中，依赖项就会被收集
  value: any;

  constructor(
    vm: Component, // 实例
    expOrFn: string | Function, // 需要解析的表达式
    cb: Function, // 回调
    options?: ?Object, // 配置项
    isRenderWatcher?: boolean // 是否为渲染函数的 watcher
  ) {
    this.vm = vm; // 保存组件实例
    // 如果是渲染函数 render 的 watcher，则保存到 _watcher 属性中
    if (isRenderWatcher) {
      vm._watcher = this;
    }
    vm._watchers.push(this); // 将该 watcher 推入到 _watchers 集合中
    // options
    // 如果存在 options
    if (options) {
      this.deep = !!options.deep; // 深度监听
      this.user = !!options.user; // 开发者定义的 wathcer -- 可能是通过 watch 选项或者 $watch api
      this.lazy = !!options.lazy; // 惰性 wathcer -- 在计算属性中会使用
      this.sync = !!options.sync; //
      this.before = options.before; // 解析表达式之前的钩子函数
    } else {
      // 否则取默认值
      this.deep = this.user = this.lazy = this.sync = false;
    }
    this.cb = cb; // 解析后执行回调
    this.id = ++uid; // uid for batching 用于批处理的uid
    this.active = true; // 是否为激活状态
    this.dirty = this.lazy; // for lazy watchers 懒散的观察者
    this.deps = []; // 当前 wathcer 依赖项
    this.newDeps = []; // 更新后 watcher 依赖项 - 用于比较更新前后的依赖项后清除无用依赖项
    this.depIds = new Set(); // 依赖项 id
    this.newDepIds = new Set(); // 更新后 watcher 依赖项 id
    // 解析表达式的字符串表示 - 用于报错提示
    this.expression =
      process.env.NODE_ENV !== 'production' ? expOrFn.toString() : '';
    // parse expression for getter getter的解析表达式
    if (typeof expOrFn === 'function' /** 当解析表达式为函数 */) {
      this.getter = expOrFn; // 直接使用即可
    } /** 如果不是函数的话 */ else {
      // 组装成函数
      this.getter = parsePath(expOrFn);
      // 如果 getter 不存在的话，那么就报错提示一下
      if (!this.getter) {
        this.getter = noop; // 重置为空函数
        process.env.NODE_ENV !== 'production' &&
          warn(
            `Failed watching path: "${expOrFn}" ` + // 监视路径失败
            'Watcher only accepts simple dot-delimited paths. ' + // Watcher只接受简单的点分隔路径。
              'For full control, use a function instead.', //  要实现完全控制，请改用函数
            vm
          );
      }
    }
    // 如果不是惰性收集的话，立即执行 get 方法用于依赖收集，并且收集表达式返回值
    this.value = this.lazy ? undefined : this.get();
  }

  /**
   * Evaluate the getter, and re-collect dependencies. 评估getter，并重新收集依赖项
   */
  get() {
    pushTarget(this); // 将该 watcher 推入到 Dep.target 中，在此过程中，表示是 wathcer 在观察依赖
    let value;
    const vm = this.vm;
    try {
      value = this.getter.call(vm, vm); // 直接执行 getter 方法就会收集依赖
    } catch (e) {
      // 如果执行过程中出现问题
      if (this.user /** 是用户自定义的 wathcer */) {
        // 使用 handleError 统一处理
        handleError(e, vm, `getter for watcher "${this.expression}"`);
      } else {
        throw e; // 如果不是用户定义的 wathcer，直接抛出错误阻断执行
      }
    } finally {
      // "touch" every property so they are all tracked as “触摸”每一处财产，以便它们都能被跟踪
      // dependencies for deep watching 深度观察的依赖性
      if (this.deep) {
        // 深度侦听
        traverse(value);
      }
      popTarget(); // 推出 Dep.target 引用
      this.cleanupDeps(); // 比较更新前后的 Dep，删除无用依赖
    }
    return value;
  }

  /**
   * Add a dependency to this directive. 将依赖项添加到此指令
   * 添加依赖项
   */
  addDep(dep: Dep) {
    const id = dep.id; // DepId
    // 如果此时不存在此 Dep 的话
    if (!this.newDepIds.has(id)) {
      // 推入到 newDepIds 和 newDeps 集合中
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      // 如果这个 Dep 不存在更新前的依赖项集合中时
      if (!this.depIds.has(id)) {
        dep.addSub(this); // 那么就需要通知 dep 添加一下该 wathcer
      }
    }
  }

  /**
   * Clean up for dependency collection. 清理依赖项集合
   */
  cleanupDeps() {
    let i = this.deps.length; // 更新前的依赖集合
    // 遍历
    while (i--) {
      const dep = this.deps[i];
      // 如果在更新后的依赖集合中不存在此 Dep
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this); // 那么就在 Dep 收集的 wathcer 集合中删除该 wathcer
      }
    }
    // 将 depIds 和 mewDepIds 等数据交换，更新前后交换
    let tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  }

  /**
   * Subscriber interface. 用户接口
   * Will be called when a dependency changes. 将在依赖项更改时调用
   */
  update() {
    /* istanbul ignore else */
    if (this.lazy /** 如果是惰性的 */) {
      this.dirty = true; // 将 dirty 标识置为 true，观察操作在计算属性的 getter 方法中会调用 evaluate 方法手动调用 get() 触发依赖更新
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run() {
    if (this.active) {
      const value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value;
        this.value = value;
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`;
          invokeWithErrorHandling(
            this.cb,
            this.vm,
            [value, oldValue],
            this.vm,
            info
          );
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher. 评估观察者的价值
   * This only gets called for lazy watchers. 这只适用于懒惰的观察者
   */
  evaluate() {
    this.value = this.get(); // 手动触发 get() 方法取值操作
    this.dirty = false; // 标识置为 false，表示该计算属性正在收集依赖
  }

  /**
   * Depend on all deps collected by this watcher. 依赖于此观察者收集的所有DEP
   * 将 lazy 惰性观察者(一般为计算属性)的依赖项移植到依赖计算属性的 wathcer 上
   */
  depend() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend(); // 触发依赖收集 - 此时收集的是依赖计算属性的 wathcer，因为计算属性的 wathcer 已经推出 Dep.target 引用
    }
  }

  /**
   * Remove self from all dependencies' subscriber list. 从所有依赖项的订户列表中删除self
   * 删除该 wathcer，不再观察
   */
  teardown() {
    // 是否为激活状态
    if (this.active) {
      // remove self from vm's watcher list 从vm的观察者列表中删除self
      // this is a somewhat expensive operation so we skip it 这是一个有点昂贵的操作，所以我们跳过它
      // if the vm is being destroyed. 如果虚拟机正在被销毁
      // _isBeingDestroyed：是否开始销毁组件
      if (!this.vm._isBeingDestroyed /** 不在销毁组件 */) {
        remove(this.vm._watchers, this); // 从 _watchers 列表中清除该 Wathcer
      }
      // 通知所有 deps，清除该 Wathcer
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false; // 表示该 Wathcer 停用状态
    }
  }
}
