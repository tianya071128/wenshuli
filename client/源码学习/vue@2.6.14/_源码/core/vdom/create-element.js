/* @flow */

import config from '../config';
import VNode, { createEmptyVNode } from './vnode';
import { createComponent } from './create-component';
import { traverse } from '../observer/traverse';

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset,
} from '../util/index';

import { normalizeChildren, simpleNormalizeChildren } from './helpers/index';

const SIMPLE_NORMALIZE = 1;
const ALWAYS_NORMALIZE = 2;

// wrapper function for providing a more flexible interface 包装器函数，用于提供更灵活的接口
// without getting yelled at by flow 不会被水流冲着吼叫
// 生成 Vnode 的方法
export function createElement(
  context: Component, // 组件实例
  tag: any, // tag 生成类型，可能是元素，可能是组件
  data: any, // 数据对象
  children: any, // 子节点
  normalizationType: any, // 标准化子节点类型 --
  alwaysNormalize: boolean // 用户自定义的 render 函数中会传入 true
): VNode | Array<VNode> {
  // 如果第二个参数是 数组 或者 基本数据类型，则表示第二个参数代表子节点
  // 参数复位
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children;
    children = data; // 子节点就是 data
    data = undefined; // 数据对象没有传入，为 undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE;
  }
  return _createElement(context, tag, data, children, normalizationType);
}

// 根据不同的 tag 生成不同的 vnode，暂时只关注一下表示子组件 vnode
export function _createElement(
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' &&
      warn(
        `Avoid using observed data object as vnode data: ${JSON.stringify(
          data
        )}\n` + 'Always create fresh vnode data objects in each render!',
        context
      );
    return createEmptyVNode();
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is;
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode();
  }
  // warn against non-primitive key
  if (
    process.env.NODE_ENV !== 'production' &&
    isDef(data) &&
    isDef(data.key) &&
    !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
          'use string/number value instead.',
        context
      );
    }
  }
  // support single function children as default scoped slot 支持单功能子项作为默认作用域插槽
  if (Array.isArray(children) && typeof children[0] === 'function') {
    data = data || {};
    data.scopedSlots = { default: children[0] };
    children.length = 0;
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children);
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children);
  }
  let vnode, ns;
  if (typeof tag === 'string') {
    let Ctor;
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (
        process.env.NODE_ENV !== 'production' &&
        isDef(data) &&
        isDef(data.nativeOn) &&
        data.tag !== 'component'
      ) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        );
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag),
        data,
        children,
        undefined,
        undefined,
        context
      );
    } else if (
      (!data || !data.pre) && // 不是 v-pre 元素
      isDef((Ctor = resolveAsset(context.$options, 'components', tag))) // 提取出 tga 对应的注册组件
    ) {
      // component 组件 -- 组件类(包括函数式组件)都会走一步
      vnode = createComponent(Ctor, data, context, children, tag);
    } else {
      // unknown or unlisted namespaced elements 未知或未列出的命名空间元素
      // check at runtime because it may get assigned a namespace when its 在运行时检查，因为当其
      // parent normalizes children 父母使孩子正常化
      vnode = new VNode(tag, data, children, undefined, undefined, context);
    }
  } /** 如果 tag 不是字符串的话，直接当成组件生成 */ else {
    // direct component options / constructor 直接组件选项/构造函数
    vnode = createComponent(tag, data, context, children);
  }
  if (Array.isArray(vnode)) {
    return vnode;
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns);
    if (isDef(data)) registerDeepBindings(data);
    return vnode;
  } else {
    return createEmptyVNode();
  }
}

function applyNS(vnode, ns, force) {
  vnode.ns = ns;
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined;
    force = true;
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i];
      if (
        isDef(child.tag) &&
        (isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))
      ) {
        applyNS(child, ns, force);
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings(data) {
  if (isObject(data.style)) {
    traverse(data.style);
  }
  if (isObject(data.class)) {
    traverse(data.class);
  }
}
