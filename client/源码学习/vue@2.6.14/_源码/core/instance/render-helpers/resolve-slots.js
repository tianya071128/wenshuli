/* @flow */

import type VNode from 'core/vdom/vnode';

/**
 * Runtime helper for resolving raw children VNodes into a slot object. 用于将原始子VNode解析为插槽对象的运行时帮助程序
 * 从 Vnode 数组中提取出插槽 Vnode(根据 Vnode.data.slot 来判断该 Vnode 属于哪个插槽)，最终规范为如下结构：{ [name: string]: ?Array<VNode> }
 */
export function resolveSlots(
  children: ?Array<VNode>, // 作为组件的子节点 - 一般为默认插槽内容
  context: ?Component // 父组件实例 - 当前渲染的是子组件
): { [key: string]: Array<VNode> } {
  // 如果不存在，直接返回
  if (!children || !children.length) {
    return {};
  }
  // 最终将子节点规范化为如下结构：{ [name: string]: ?Array<VNode> }
  const slots = {};
  // 遍历子节点
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i];
    const data = child.data;
    // remove slot attribute if the node is resolved as a Vue slot node 如果节点解析为 Vue 插槽节点，则删除插槽属性
    // 兼容废弃了的插槽语法，例如：<div slot="header">默认插槽1</div>，此时会在 div 元素对应的 Vnode 上打上额外的标记: Vnode.slot = 'header'，但是需要清除 attrs.slot，防止添加不必要的 slot 属性
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot;
    }
    // named slots should only be respected if the vnode was rendered in the 命名槽只有在vnode在
    // same context. 相同的背景
    if (
      (child.context === context || child.fnContext === context) &&
      data && // data.slot：当前子节点属于哪个插槽，例如：default => 在废弃的插槽语法中，具名插槽也可能会作为子节点
      data.slot != null
    ) {
      const name = data.slot; // 插槽名字
      const slot = slots[name] || (slots[name] = []); // 将该名字作为 key 存放在 slots 中
      if (child.tag === 'template') {
        // 如果当前子节点是 template 的话，那么在 template 的子节点都作为当前插槽名字的 Vnode
        slot.push.apply(slot, child.children || []);
      } else {
        // 否则将该子节点 Vnode 推入到 slots 对应的集合中
        slot.push(child);
      }
    } else {
      // 否则的话，统一作为 default 默认插槽
      (slots.default || (slots.default = [])).push(child);
    }
  }
  // ignore slots that contains only whitespace 忽略仅包含空白的插槽
  for (const name in slots) {
    // 检测某个插槽的 Vnode 全部都是空白节点
    if (slots[name].every(isWhitespace)) {
      // 此时直接抛弃掉这个插槽
      delete slots[name];
    }
  }
  return slots;
}

// 判断是否为空白节点
function isWhitespace(node: VNode): boolean {
  return (
    (node.isComment && !node.asyncFactory) || // 当前 Vnode 是一个注释节点(异步组件 isComment 标识也是 true)
    node.text === ' ' // 或者就是一个 ' ' 空格文本的节点
  );
}
