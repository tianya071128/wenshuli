import { Vue } from './vue';

export type ScopedSlot = (props: any) => ScopedSlotReturnValue;
type ScopedSlotReturnValue =
  | VNode
  | string
  | boolean
  | null
  | undefined
  | ScopedSlotReturnArray;
interface ScopedSlotReturnArray extends Array<ScopedSlotReturnValue> {}

// Scoped slots are guaranteed to return Array of VNodes starting in 2.6
export type NormalizedScopedSlot = (props: any) => ScopedSlotChildren;
export type ScopedSlotChildren = VNode[] | undefined;

// Relaxed type compatible with $createElement
export type VNodeChildren =
  | VNodeChildrenArrayContents
  | [ScopedSlot]
  | string
  | boolean
  | null
  | undefined;
export interface VNodeChildrenArrayContents
  extends Array<VNodeChildren | VNode> {}

export interface VNode {
  tag?: string;
  data?: VNodeData;
  children?: VNode[];
  text?: string;
  elm?: Node;
  ns?: string;
  context?: Vue;
  key?: string | number | symbol | boolean;
  componentOptions?: VNodeComponentOptions;
  componentInstance?: Vue;
  parent?: VNode;
  raw?: boolean;
  isStatic?: boolean;
  isRootInsert: boolean;
  isComment: boolean;
}

export interface VNodeComponentOptions {
  Ctor: typeof Vue;
  propsData?: object;
  listeners?: object;
  children?: VNode[];
  tag?: string;
}

/**
 * Vnode 的数据对象, 用于描述这个 Vnode
 * 具体可见: https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1
 */
export interface VNodeData {
  key?: string | number;
  slot?: string;
  scopedSlots?: { [key: string]: ScopedSlot | undefined };
  ref?: string;
  refInFor?: boolean;
  tag?: string;
  staticClass?: string;
  class?: any;
  staticStyle?: { [key: string]: any };
  style?: string | object[] | object;
  props?: { [key: string]: any };
  attrs?: { [key: string]: any };
  domProps?: { [key: string]: any };
  // 这个 hook 表示的是这个 Vnode 的钩子函数, 会在 Vnode 的全周期过程中触发, 触发方法见 core\vdom\patch.js 文件
  hook?: { [key: string]: Function };
  on?: { [key: string]: Function | Function[] };
  nativeOn?: { [key: string]: Function | Function[] };
  transition?: object;
  show?: boolean;
  inlineTemplate?: {
    render: Function;
    staticRenderFns: Function[];
  };
  directives?: VNodeDirective[];
  keepAlive?: boolean;
}

export interface VNodeDirective {
  name: string;
  value?: any;
  oldValue?: any;
  expression?: string;
  arg?: string;
  oldArg?: string;
  modifiers?: { [key: string]: boolean };
}
