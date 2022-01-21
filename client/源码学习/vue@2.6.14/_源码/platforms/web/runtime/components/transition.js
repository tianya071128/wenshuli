/* @flow */

// Provides transition support for a single element/component.
// supports transition mode (out-in / in-out)

import { warn } from 'core/util/index';
import { camelize, extend, isPrimitive } from 'shared/util';
import {
  mergeVNodeHook,
  isAsyncPlaceholder,
  getFirstComponentChild,
} from 'core/vdom/helpers/index';

export const transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object],
};

// in case the child is also an abstract component, e.g. <keep-alive> 如果孩子也是一个抽象组件，例如<keep alive>
// we want to recursively retrieve the real component to be rendered 我们希望递归地检索要渲染的真实组件
// 抽象组件是不渲染任何内容的，我们需要递归查找出真正渲染的组件
function getRealChild(vnode: ?VNode): ?VNode {
  const compOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions;
  // 该 vnode 表示的是一个抽象组件类型 Vnode，此时
  if (compOptions && compOptions.Ctor.options.abstract) {
    // 递归抽象组件的子节点数组的第一个组件类型 Vnode
    return getRealChild(getFirstComponentChild(compOptions.children));
  } else {
    return vnode;
  }
}

export function extractTransitionData(comp: Component): Object {
  const data = {};
  const options: ComponentOptions = comp.$options;
  // props
  for (const key in options.propsData) {
    data[key] = comp[key];
  }
  // events.
  // extract listeners and pass them directly to the transition methods
  const listeners: ?Object = options._parentListeners;
  for (const key in listeners) {
    data[camelize(key)] = listeners[key];
  }
  return data;
}

// ？？？
function placeholder(h: Function, rawChild: VNode): ?VNode {
  // 检测 rawChild 是否是 keep-alive 组件
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    // 渲染 keep-alive 组件
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData,
    });
  }
}

/**
 * <transition><my-component v-show="flag" /></transition>
 * myComponent: <transition><div>子组件</div></transition>
 * 针对于子组件来说，如果父组件中正在进行过渡，那么这里就没有必要处理了
 */
function hasParentTransition(vnode: VNode): ?boolean {
  // vnode.parent：组件根节点 vnode 引用的该组件类型 Vnode
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true;
    }
  }
}

function isSameChild(child: VNode, oldChild: VNode): boolean {
  return oldChild.key === child.key && oldChild.tag === child.tag;
}

const isNotTextNode = (c: VNode) => c.tag || isAsyncPlaceholder(c);

const isVShowDirective = (d) => d.name === 'show';

export default {
  name: 'transition',
  props: transitionProps, // 接收的 prop
  abstract: true, // 抽象组件 - 它自身不会渲染一个 DOM 元素，也不会出现在组件的父组件链中。

  // 渲染函数
  render(h: Function) {
    let children: any = this.$slots.default; // 提取默认插槽 - 子节点
    // 不存在子节点的话，退出
    if (!children) {
      return;
    }

    // filter out text nodes (possible whitespaces) 过滤掉文本节点（可能的空白）
    children = children.filter(isNotTextNode);
    /* istanbul ignore if */
    if (!children.length) {
      return;
    }

    // warn multiple elements 警告多个元素
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' + // <transition>只能在单个元素上使用。使用
          '<transition-group> for lists.', // 列表的<transition group>。
        this.$parent
      );
    }

    const mode: string = this.mode; // 控制离开/进入过渡的时间序列。有效的模式有 "out-in" 和 "in-out"；默认同时进行。

    // warn invalid mode 警告无效模式
    if (
      process.env.NODE_ENV !== 'production' &&
      mode &&
      mode !== 'in-out' &&
      mode !== 'out-in'
    ) {
      warn('invalid <transition> mode: ' + mode, this.$parent); // 无效的<transition>模式
    }

    // 即使传入了多个元素，上面会进行警告，但是并不会阻止执行，所以在这里我们只取第一个元素
    const rawChild: VNode = children[0];

    // if this is a component root node and the component's 如果这是组件根节点和组件的
    // parent container node also has transition, skip. 父容器节点还具有转换、跳过。
    // 该过渡元素是组件的根节点，但是父组件也在过渡中，那么就没有必要在这里重复过渡了？？？
    if (hasParentTransition(this.$vnode)) {
      return rawChild;
    }

    // apply transition data to child 将转换数据应用于子对象
    // use getRealChild() to ignore abstract components e.g. keep-alive 使用getRealChild（）忽略抽象组件，例如保持活动状态
    // 抽象组件是不渲染任何内容的，我们需要递归查找出真正渲染的组件 -- 忽略抽象组件
    const child: ?VNode = getRealChild(rawChild);
    /* istanbul ignore if */
    if (!child) {
      return rawChild; // 如果不存在的话，什么动作都不做，直接返回
    }

    // ？？？
    if (this._leaving) {
      return placeholder(h, rawChild);
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    const id: string = `__transition-${this._uid}-`;
    child.key =
      child.key == null
        ? child.isComment
          ? id + 'comment'
          : id + child.tag
        : isPrimitive(child.key)
        ? String(child.key).indexOf(id) === 0
          ? child.key
          : id + child.key
        : child.key;

    const data: Object = ((
      child.data || (child.data = {})
    ).transition = extractTransitionData(this));
    const oldRawChild: VNode = this._vnode;
    const oldChild: VNode = getRealChild(oldRawChild);

    // mark v-show
    // so that the transition module can hand over the control to the directive
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      child.data.show = true;
    }

    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(
        oldChild.componentInstance &&
        oldChild.componentInstance._vnode.isComment
      )
    ) {
      // replace old child transition data with fresh one
      // important for dynamic transitions!
      const oldData: Object = (oldChild.data.transition = extend({}, data));
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true;
        mergeVNodeHook(oldData, 'afterLeave', () => {
          this._leaving = false;
          this.$forceUpdate();
        });
        return placeholder(h, rawChild);
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild;
        }
        let delayedLeave;
        const performLeave = () => {
          delayedLeave();
        };
        mergeVNodeHook(data, 'afterEnter', performLeave);
        mergeVNodeHook(data, 'enterCancelled', performLeave);
        mergeVNodeHook(oldData, 'delayLeave', (leave) => {
          delayedLeave = leave;
        });
      }
    }

    return rawChild;
  },
};
