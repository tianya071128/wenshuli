/* @flow */

import { extend, warn, isObject } from 'core/util/index';

/**
 * Runtime helper for rendering <slot> 用于渲染<slot>
 * 用于渲染插槽，提取出 Vndoe
 */
export function renderSlot(
  name: string, // 插槽名称
  fallbackRender: ?((() => Array<VNode>) | Array<VNode>), // 插槽后备内容的 Vnode 数组生成函数
  props: ?Object, // 作用域插槽传入值
  bindObject: ?Object //
): ?Array<VNode> {
  const scopedSlotFn = this.$scopedSlots[name]; // 从 $scopedSlots 中提取出插槽函数
  let nodes;
  if (scopedSlotFn) {
    // scoped slot
    props = props || {};
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn('slot v-bind without argument expects an Object', this);
      }
      props = extend(extend({}, bindObject), props);
    }
    nodes =
      scopedSlotFn(props) ||
      (typeof fallbackRender === 'function'
        ? fallbackRender()
        : fallbackRender);
  } else {
    // 如果在 $scopedSlots 中不存在该插槽
    nodes =
      this.$slots[name] || // 尝试从 $slots 中提取 - 为了兼容低版本？(因为在 2.6.0 中，所有的 $slots 现在都会作为函数暴露在 $scopedSlots 中。)
      (typeof fallbackRender === 'function' // 否则从后备内容主公尝试提取
        ? fallbackRender()
        : fallbackRender);
  }

  const target = props && props.slot; // ？？？
  if (target) {
    /** 在这里，可以将普通插槽进行转发，例如在组件模板中 */
    // <!-- 如下会被生成：_c('my-component2', [_t("jumingslot", null, {"slot": "zhuanfa"})], 2)] -->
    // _t("jumingslot", null, {"slot": "zhuanfa"}) ===> 生成如下 Vnode { tag: template, data: { slot: zhuanfa }, children: [Vnode] }
    //
    // <my-component2>
    //   <!-- 并且还可以切换一下插槽名字 -->
    //   <slot name="jumingslot" slot="zhuanfa"></slot>
    // </my-component2>
    return this.$createElement('template', { slot: target }, nodes);
  } else {
    return nodes; // 返回 vnode
  }
}
