/* @flow */

import { def } from 'core/util/lang';
import { normalizeChildren } from 'core/vdom/helpers/normalize-children';
import { emptyObject } from 'shared/util';
import { isAsyncPlaceholder } from './is-async-placeholder';

/**
 * 处理作用域插槽：
 *  1. 先根据各个缓存属性来判断是否可以从上一次提取结果获取
 *  2. 遍历 slots(作用域插槽集合，一般对应 vnode.data.scopedSlots)，将作用域插槽函数进一步封装
 *     - 如果是使用 v-slot 新语法的话，那么就在　normalSlots(一般对应 vm.$slots) 参数上添加这个插槽 key - 通过复杂数据对象引用改变入参
 *  3. 遍历已经提取出来的插槽(对应 vm.$slots)，如果不存在作用域插槽集合(对应 vm.$scopedSlots)中，那么就封装一下添加在作用域插槽集合
 *     - 在 2.6.0 中，所有的插槽现在都会作为函数暴露在 $scopedSlots 中。
 *
 * 总而言之，这里可能会将插槽处理为如下结构：
 *  slots(对应 vm.$scopedSlots) {
 *    default: f (),
 *    jumingslot: f (),
 *    scopeslot: f ()
 *  }
 *
 *  noramlSlots(对应 vm.$slots) { // 注意这里已经将具名插槽(不包含作用域插槽)已经提取出来了
 *    default: Array<VNode>,
 *    jumingslot: Array<VNode>
 *  }
 */
export function normalizeScopedSlots(
  slots: { [key: string]: Function } | void, // 父组件传入的插槽(不包含作为子节点传入的) - vnode.data.scopedSlots
  normalSlots: { [key: string]: Array<VNode> }, // 已经提取出来的插槽，格式为：{ [name: string]: ?Array<VNode> }
  prevSlots?: { [key: string]: Function } | void // 上一次渲染出来的 vm.$scopedSlots -- 在 2.6.0 以后，所有的 $slots 现在都会作为函数暴露在 $scopedSlots 中。
): any {
  let res;
  const hasNormalSlots = Object.keys(normalSlots).length > 0; // 是否存在已经规范化的插槽
  const isStable = slots ? !!slots.$stable : !hasNormalSlots;
  const key = slots && slots.$key;
  if (!slots /** 如果父组件没有传入插槽的话 */) {
    res = {};
  } else if (slots._normalized /** 父组件没有重新渲染，取缓存值 */) {
    // fast path 1: child component re-render only, parent did not change 快速路径1：仅子组件重新渲染，父组件未更改
    // 此时父组件没有重新渲染，所以 slots 还是一个上一次渲染的值，此时取缓存值
    return slots._normalized;
  } else if (
    isStable && // 是否是稳定的
    prevSlots && // 上一个渲染已经提取出来的所有插槽
    prevSlots !== emptyObject && // 上个渲染存在提取的插槽
    key === prevSlots.$key &&
    !hasNormalSlots &&
    !prevSlots.$hasNormal
  ) {
    // fast path 2: stable scoped slots w/ no normal slots to proxy, 快速路径2：稳定作用域插槽，没有正常插槽到代理
    // only need to normalize once 只需要正常化一次
    return prevSlots; // 直接使用上一次的
  } else {
    // 如果上面快速路径没有通过，就可以在这里处理一下作用域插槽
    res = {};
    for (const key in slots) {
      if (slots[key] && key[0] !== '$' /** $ 开头的是标识属性 */) {
        /**
         * 对作用域插槽函数进一步封装：
         * 1. 封装函数主要调用作用域插槽函数(slots[key])返回 Vnode 数组，并对返回值进行检测，在返回值无效的情况下返回 undefined
         * 2. 如果是使用 v-slot 新语法的话，那么就在　normalSlots(一般对应 vm.$slots) 参数上添加这个插槽 key - 通过复杂数据对象引用改变入参
         */
        res[key] = normalizeScopedSlot(normalSlots, key, slots[key]);
      }
    }
  }
  // expose normal slots on scopedSlots 在 scopedSlots 上公开普通插槽
  // 遍历已经提取出来的插槽(对应 vm.$slots)，如果不存在作用域插槽集合(对应 vm.$scopedSlots)中，那么就封装一下添加在作用域插槽集合
  for (const key in normalSlots) {
    // 这里遍历，已经触发了 normalSlot 属性的 getter 方法，也就提取出了具名插槽(不包含作用域插槽)
    // 在 2.6.0 中，所有的插槽现在都会作为函数暴露在 $scopedSlots 中。
    if (!(key in res) /** 检测作用域插槽是否存在 res */) {
      res[key] = proxyNormalSlot(normalSlots, key);
    }
  }
  // avoriaz seems to mock a non-extensible $scopedSlots object avoriaz似乎模拟了一个不可扩展的$scopedSlots对象
  // and when that is passed down this would cause an error 当这被传递下去时，这将导致一个错误
  // Object.isExtensible：判断一个对象是否为可扩展的
  if (slots && Object.isExtensible(slots)) {
    (slots: any)._normalized = res; // 缓存一下提取结果
  }
  def(res, '$stable', isStable);
  def(res, '$key', key);
  def(res, '$hasNormal', hasNormalSlots);
  return res;
}

/**
 * 对作用域插槽函数进一步封装：
 * 1. 封装函数主要调用作用域插槽返回 Vnode 数组，并对返回值进行检测，在返回值无效的情况下返回 undefined
 * 2. 如果是使用 v-slot 新语法的话，那么就在　normalSlots(一般对应 vm.$slots) 参数上添加这个插槽 key - 通过复杂数据对象引用改变入参
 */
function normalizeScopedSlot(
  normalSlots, // 已经提取的插槽：{ [name: string]: ?Array<VNode> }
  key, // 当前需要提取的插槽 key
  fn // 作用域插槽函数 - 调用函数返回数组 Vnode
) {
  // 对作用域插槽函数进一步封装，在内部，调用作用域插槽返回 Vnode 数组，并对返回值进行检测，在返回值无效的情况下返回 undefined
  const normalized = function() {
    let res = arguments.length ? fn.apply(null, arguments) : fn({}); // 调用作用域插槽函数，
    res = // 最终返回一个 Vnode 数组(在返回值无效的情况下返回 undefined)
      res && typeof res === 'object' && !Array.isArray(res)
        ? [res] // single vnode 单个 vnode
        : normalizeChildren(res); // 多个 Vnode，规整一下子节点
    let vnode: ?VNode = res && res[0];
    // 简单讲，就是判断作用域插槽函数返回的 Vnode 是否符合要求，否则返回 undefined
    return res &&
      (!vnode || // 第一项为 undefined 的话
        (res.length === 1 && vnode.isComment && !isAsyncPlaceholder(vnode))) // #9658, #10391 检测如果 res 只有一个 Vnode，并且是一个注释节点
      ? undefined
      : res;
  };
  // this is a slot using the new v-slot syntax without scope. although it is 这是一个使用新的v-slot语法的插槽，没有作用域。虽然是
  // compiled as a scoped slot, render fn users would expect it to be present 作为作用域插槽编译，render fn用户希望它出现
  // on this.$slots because the usage is semantically a normal slot. 在这个问题上$插槽，因为该用法在语义上是正常插槽。
  if (
    fn.proxy //使用 v-slot 语法的插槽的话，我们就在 vm.$slots 上也添加这个插槽 -- 注意：这里不包含作用域插槽
  ) {
    // 通过复杂数据类型的特性，我们往 normalSlots 添加 key 属性，就会同步修改传递进来的参数
    Object.defineProperty(normalSlots, key, {
      get: normalized, // 当使用了这个插槽时，才会去进行函数调用，提取出真正的插槽，但其实下一步就是进行属性的获取
      enumerable: true, // 可枚举
      configurable: true, // 可配置
    });
  }
  return normalized;
}

// 封装一下普通插槽(这个插槽已经提取出 Vnode 的)
function proxyNormalSlot(slots, key) {
  return () => slots[key];
}
