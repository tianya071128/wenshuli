/* @flow */

// 检测指定 Vnode 是否为异步组件空白 Vnode -- 此时异步组件没有可渲染的组件，就会生成一个空 Vnode 作为 占位
export function isAsyncPlaceholder(node: VNode): boolean {
  return node.isComment && node.asyncFactory;
}
