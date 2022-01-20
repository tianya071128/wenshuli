/* @flow */

import { isDef } from 'shared/util';
import { isAsyncPlaceholder } from './is-async-placeholder';

// 获取数组节点中第一个组件类型 Vnode
export function getFirstComponentChild(children: ?Array<VNode>): ?VNode {
  if (Array.isArray(children) /** 判断是数组子节点并进行遍历 */) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      // 检测该 Vnode 是否为组件类型 Vnode
      if (
        isDef(c) && // 该子节点存在
        (isDef(c.componentOptions) || isAsyncPlaceholder(c)) // 该 vnode.componentOptions 存在(表示是一个组件类型 Vnode) || 是一个异步组件空节点(此时异步组件暂时没有渲染的状态组件)
      ) {
        return c;
      }
    }
  }
}
