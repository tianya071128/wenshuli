/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util';
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode';
import { renderList } from './render-list';
import { renderSlot } from './render-slot';
import { resolveFilter } from './resolve-filter';
import { checkKeyCodes } from './check-keycodes';
import { bindObjectProps } from './bind-object-props';
import { renderStatic, markOnce } from './render-static';
import { bindObjectListeners } from './bind-object-listeners';
import { resolveScopedSlots } from './resolve-scoped-slots';
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys';

// render 函数的工具方法 - 一般内置编译器编译模板时生成调用这些方法的 render 函数
export function installRenderHelpers(target: any) {
  target._o = markOnce;
  target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  target._t = renderSlot; // 渲染插槽
  target._q = looseEqual;
  target._i = looseIndexOf;
  target._m = renderStatic; // 渲染静态树工具类 - v-once
  target._f = resolveFilter;
  target._k = checkKeyCodes;
  target._b = bindObjectProps;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  target._u = resolveScopedSlots;
  target._g = bindObjectListeners;
  target._d = bindDynamicKeys;
  target._p = prependModifier;
}
