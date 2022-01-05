/* @flow */

import { hasOwn } from 'shared/util';
import { warn, hasSymbol } from '../util/index';
import { defineReactive, toggleObserving } from '../observer/index';

/**
 * 初始化 provide 数据 -- 祖先组件向其所有子孙后代注入一个依赖
 * 策略：
 *  1. 直接从 vm.$options.provide 中提取出来即可，与 data 类似，如果是函数调用则提取函数，如果是对象则直接返回
 *  2. 直接赋值到  vm._provided 上，因为这个是祖先组件注入的依赖，子组件获取这个依赖时，会递归查找祖先组件的 _provided 属性获取依赖，详见 resolveInject 函数
 */
export function initProvide(vm: Component) {
  // 提取出 provide -- 在选项合并中，一般会合并成一个函数
  const provide = vm.$options.provide;
  if (provide) {
    // 然后直接调用这个函数或直接是 provide 配置对象
    vm._provided = typeof provide === 'function' ? provide.call(vm) : provide;
  }
}

/**
 * 初始化 inject 数据 -- 依赖注入，接收祖先组件注入的依赖
 * 策略：
 *  1. 从祖先组件(或取 default 默认值)中提取出 inject 的值
 *  2. 递归 inject 配置的 key，通过 defineReactive 方法(只读属性 key)注入到 vm 实例上
 */
export function initInjections(vm: Component) {
  // 从 inject 中提取出结果
  const result = resolveInject(vm.$options.inject, vm);
  // 存在值
  if (result) {
    toggleObserving(false); // 不进行观察 => provide 和 inject 绑定并不是可响应的。
    // 递归添加 inject 的 key 到 vm 实例上
    Object.keys(result).forEach((key) => {
      // 如果是开发环境，那么就在尝试修改 key 的时候警告报错
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        // 因为 toggleObserving(false) 调用了，所以不会进行深度侦听
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
              `overwritten whenever the provided component re-renders. ` +
              `injection being mutated: "${key}"`,
            vm
          );
        });
      } else {
        defineReactive(vm, key, result[key]);
      }
    });
    toggleObserving(true);
  }
}

/**
 * 处理 inject 策略：
 *  1，从祖先组件(也会从自身中开始查找)中找到注入的 key，提取出来
 *  2. 如果没有找到，就取配置的默认值
 */
export function resolveInject(inject: any, vm: Component): ?Object {
  if (inject /** 如果配置了 inject 选项的话 */) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null); // 初始结果值
    const keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject); // 提取所有的 key

    // 遍历 key
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // #6574 in case the inject object is observed... 如果观察到注入对象。。。
      if (key === '__ob__') continue; // 如果是观察属性 __ob__，那么就不要进行处理
      // 注入的 key
      const provideKey = inject[key].from; // from：祖先组件注入的 key
      let source = vm;
      // 递归查找父组件，直至 root 根组件
      while (source) {
        // 如果在 _provided(如果配置了 provide 选项，那么就会将值提取到 _provided) 属性中找到了注入的 key
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]; // 则提取值
          break;
        }
        source = source.$parent; // 指向父组件
      }
      if (!source /** 没有找到 */) {
        if ('default' in inject[key] /** 如果配置了 default 默认值的话 */) {
          const provideDefault = inject[key].default;
          result[key] =
            typeof provideDefault === 'function' // 如果是函数
              ? provideDefault.call(vm) // 执行函数
              : provideDefault;
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm); // 没有找到 key
        }
      }
    }
    return result;
  }
}
