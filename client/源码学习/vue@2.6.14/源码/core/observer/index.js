/* @flow */

import Dep from './dep';
import VNode from '../vdom/vnode';
import { arrayMethods } from './array';
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
} from '../util/index';

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's 在某些情况下，我们可能希望禁用组件内部的观察
 * update computation. 更新计算
 */
export let shouldObserve: boolean = true; //标识，进行响应式数据的标识

// 切换标识
export function toggleObserving(value: boolean) {
  shouldObserve = value;
}

/**
 * Observer class that is attached to each observed 附加到每个观察对象的观察者类
 * object. Once attached, the observer converts the target 对象连接后，观察者将转换目标
 * object's property keys into getter/setters that 对象的属性键插入
 * collect dependencies and dispatch updates. 收集依赖项并发送更新
 */
export class Observer {
  value: any; // 原始数据
  dep: Dep; // 依赖项收集器
  vmCount: number; // number of vms that have this object as root $data 将此对象作为根 $data 的 vms

  constructor(value: any) {
    this.value = value; // 保存原始数据
    this.dep = new Dep(); // 依赖项收集器
    this.vmCount = 0; // 标识根 data
    def(value, '__ob__', this); // 在 value 上添加 __ob__ 属性
    if (Array.isArray(value) /** 数组情况下 */) {
      // 数组情况下，因为 Object.defineProperty 无法拦截数组操作，所以就需要先手动拦截数组方法操作，在添加响应式。
      // 而对于 a[0] 索引读取修改操作的话，我们就没有办法进行响应式操作，需要注意一下
      // 对于数组，我们需要拦截数组方法操作，用于在数组改变时进行响应式操作，重写后的数组方法定义在 arrayMethods 中
      if (hasProto /** 是否支持 __proto__ 属性操作 */) {
        protoAugment(value, arrayMethods); // 直接使用 __proto__ 来改变 value 的原型指向 arrayMethods
      } else {
        copyAugment(value, arrayMethods, arrayKeys); // 不支持 __proto__ 的话，那么就在 value 数组本身添加数组方法(arrayKeys)，用于拦截数组方法操作
      }
      this.observeArray(value);
    } /** 对象情况下 */ else {
      // 对象操作简单，只需要遍历这个对象，然后通过 defineReactive 方法来添加响应式数据
      this.walk(value);
    }
  }

  /**
   * Walk through all properties and convert them into 浏览所有属性并将其转换为
   * getter/setters. This method should only be called when  getter/setters. 只有在以下情况下才应调用此方法
   * value type is Object. 值类型是对象
   */
  walk(obj: Object) {
    // key 集合
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]); // 遍历 key 添加响应属性
    }
  }

  /**
   * Observe a list of Array items. 观察数组项的列表
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting 通过拦截来扩充目标对象或数组
 * the prototype chain using __proto__ 使用_proto的原型链__
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining 通过定义
 * hidden properties. 隐藏属性
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  // 遍历 keys(需要拦截的数组方法操作)
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]); // 通过定义在 target 上覆盖数组方法，从而拦截数组方法操作
  }
}

/**
 * Attempt to create an observer instance for a value, 尝试为值创建观察者实例
 * returns the new observer if successfully observed, 如果观察成功，则返回新的观察者
 * or the existing observer if the value already has one. 或现有的观察者（如果该值已有）
 * 响应式数据的入口
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (
    !isObject(value) /** 不是对象的话 */ ||
    value instanceof VNode /** 还需要排除 VNode 对象 */
  ) {
    return;
  }
  let ob: Observer | void;
  // 如果这个对象中存在 __ob__ 属性并且是 Observer 实例，说明已经响应式数据了的，此时就直接返回 __ob__ 属性即可
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    shouldObserve && // 允许进行响应式
    !isServerRendering() && // 不是服务端渲染
    (Array.isArray(value) || isPlainObject(value)) && // 是对象或数组才可以响应式
    Object.isExtensible(value) && // 判断一个对象是否是可扩展的 -- 只有可扩展的对象才能进行响应式
    !value._isVue // 不是组件实例
  ) {
    ob = new Observer(value); // 响应式数据
  }
  if (asRootData /** 根数据，在内部源码中就是表示 data 对象的最外层 */ && ob) {
    ob.vmCount++; // 标识 +1 -- 作用？
  }
  return ob;
}

/**
 * Define a reactive property on an Object. 在对象上定义被动特性
 * 在 obj 添加 key 响应式属性，一般而言，存在两种类型调用，通过 Obsever 类来响应式指定数据，或直接调用这个方法在 obj 添加 key 响应式数据
 * 逻辑如下：
 *  通过 Object.defineProperty 在 obj 上重写 key 属性(不会改变 obj 引用)，主要是拦截 getter/setter 操作，对其属性读写操作一般符合默认读写行为
 *    getter 拦截读取操作：通过闭包引用的 dep 类来收集依赖了这个 key 的 watcher 类，
 *                        比较难以理解的是 “还需要将 wathcer 收集到属性值 val 的 Dep 类中”
 *    setter 拦截写入操作：首先完成写入操作，然后通过 dep.notify() 让 wathcer 类更新
 */
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function, // 属性改变后的回调
  shallow?: boolean // 是否深度响应式
) {
  const dep = new Dep(); // 通过闭包引用一个依赖项收集器

  const property = Object.getOwnPropertyDescriptor(obj, key); // 获取 key 对应的对象配置属性
  // configurable: 当且仅当指定对象的属性描述可以被改变或者属性可被删除时
  // 所以这个表示如果对象属性不可改变，则直接返回
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters 满足预定义的getter/setter
  const getter = property && property.get; // 原始 getter 方法
  const setter = property && property.set; // 原始 setter 方法
  if (
    (!getter || setter) && // 不存在 getter 方法 || 存在 setter 方法
    arguments.length === 2 // 只传入两个参数，说明没有传入 val
  ) {
    val = obj[key]; // 此时直接在 obj 上取出 key 属性值
  }

  let childOb = !shallow && observe(val); // 表示是否深度响应式，childOb 表示返回的是 Observer 对象
  // 接下来就是通过 Object.defineProperty 方法来侦听 obj 对象的 setter/getter 方法
  // 在 setter 方法中：我们拦截属性赋值操作，并且通过闭包引用的 dep 对象，触发所有 watcher 对象更新
  // 在 getter 方法中：拦截属性读取操作，将在 Dep.target(如果存在的话，一般是引用 watcher 类) 引用的 watcher 收集到 dep 对象上
  Object.defineProperty(obj, key, {
    enumerable: true, // 可配置
    configurable: true, // 可扩展
    // 属性读取操作：遵循属性读取的原则，将属性读取出来并返回。但是在这中间，我们就需要收集 watcher 类
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val; // 如果原始属性配置项存在 getter 方法，则通过 getter 方法取值
      if (
        Dep.target /** 如果 Dep.target 中存在 watcher 类的话，就需要进行 watcher 收集 */
      ) {
        dep.depend(); // 通过 depend 方法收集 watcher

        // 下面这一段，会将对这个 key 以及 key 对应的 val(如果是对象或数组的话，深度响应对象)的所有依赖项都收集到 childOb.dep(引用的是 val.__ob__.dep) 中
        // 例如：test: {a: 2, b: { c: 1 }} 这样的属性，将会收集所有依赖 test 以及对象所有的 key。
        // 会在 set 或 del 方法中动态添加属性时触发一下收集的 watcher，详见下面的 set 方法
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            // 如果是数组，就需要遍历数组
            dependArray(value);
          }
        }
      }
      return value; // 返回属性对应的值
    },
    // 属性赋值操作
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val; // 获取赋值前的值
      /* eslint-disable no-self-compare */
      // 如果没有变化的话，什么都不做
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      // 只有在开发环境下，才会在属性改变时，触发回调(一般这个回调都是提示不要修改值)
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return; // 没有设置 setter 方法表示这是一个只读属性
      // 如果定义了 setter 值通过 setter 改变，否则直接改变
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      // 修改 childOb 引用
      childOb = !shallow && observe(newVal);
      // 触发 wathcer 类更新
      dep.notify();
    },
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (
    process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' &&
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
      );
    return val;
  }
  if (!ob) {
    target[key] = val;
    return val;
  }
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array<any> | Object, key: any) {
  if (
    process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  const ob = target.__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' &&
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
          '- just set it to null.'
      );
    return;
  }
  if (!hasOwn(target, key)) {
    return;
  }
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since 在接触数组时收集对数组元素的依赖项，因为
 * we cannot intercept array element access like property getters. 我们不能像属性获取程序那样拦截数组元素访问
 */
function dependArray(value: Array<any>) {
  // 遍历
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]; // 提取属性值
    e && e.__ob__ && e.__ob__.dep.depend(); // 如果存在 __ob__ 属性表示是响应式数据，就将其收集起来
    // 如果还是数组，则继续收集一下
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}
