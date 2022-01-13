/* @flow */

export default class VNode {
  tag: string | void;
  data: VNodeData | void; /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
  children: ?Array<VNode>; // 当前节点的子节点，是一个数组
  text: string | void; // 当前节点的文本
  elm: Node | void; // 当前虚拟节点对应的真实dom节点
  ns: string | void; // 当前节点的名字空间
  context: Component | void; // rendered in this component's scope 在该组件的作用域中呈现
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void;
  componentInstance: Component | void; // component instance
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder? 空注释占位符 - 注释节点
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;
  fnContext: Component | void; // real context vm for functional nodes
  fnOptions: ?ComponentOptions; // for SSR caching
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  fnScopeId: ?string; // functional scope id support 函数式组件的作用域id支持

  constructor(
    tag?: string, // 节点名
    data?: VNodeData, // 数据对象
    children?: ?Array<VNode>, // 子节点
    text?: string, // 文本
    elm?: Node, // vnode 渲染后的 DOM
    context?: Component, // 渲染这个 vnode 的实例上下文
    componentOptions?: VNodeComponentOptions, // 子组件的配置项
    asyncFactory?: Function // 异步组件
  ) {
    this.tag = tag;
    this.data = data; /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
    this.children = children; // 当前节点的子节点，是一个数组
    this.text = text; // 当前节点的文本
    /**
     * 这个属性对应的就是真实 DOM
     * 如果是组件类型 Vnode，这个就表示组件的根元素(如果组件根元素也是组件，那么就递归至最终的一个实际根元素)
     */
    this.elm = elm; // 当前虚拟节点对应的真实dom节点
    this.ns = undefined; // 当前节点的名字空间 -- 命名空间可查看 https://developer.mozilla.org/zh-CN/docs/Web/API/Document/createElementNS#example
    this.context = context; // 当前 vnode 的渲染组件实例 -- 需要注意的是插槽
    this.fnContext = undefined;
    this.fnOptions = undefined;
    this.fnScopeId = undefined; // 函数式组件的作用域id支持
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
    this.raw = false;
    this.isStatic = false; // 静态节点标志
    this.isRootInsert = true;
    this.isComment = false; // 空注释占位符 - 注释节点
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance;
  }
}

// 生成一个空的文本 VNode
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode();
  node.text = text;
  node.isComment = true;
  return node;
};

export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val));
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  );
  cloned.ns = vnode.ns;
  cloned.isStatic = vnode.isStatic;
  cloned.key = vnode.key;
  cloned.isComment = vnode.isComment;
  cloned.fnContext = vnode.fnContext;
  cloned.fnOptions = vnode.fnOptions;
  cloned.fnScopeId = vnode.fnScopeId;
  cloned.asyncMeta = vnode.asyncMeta;
  cloned.isCloned = true;
  return cloned;
}
