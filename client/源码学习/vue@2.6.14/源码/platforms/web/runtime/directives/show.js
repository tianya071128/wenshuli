/* @flow */

import { enter, leave } from '../modules/transition';

// recursively search for possible transition defined inside the component root 递归搜索组件根目录中定义的可能转换
// 如果这个 Vnode 是一个组件类型 Vnode 并且是被 transition 包裹需要做过渡的, 那么就递归查找到这个 Vnode 组件的根元素 Vnode
function locateNode(vnode: VNode): VNodeWithData {
  return vnode.componentInstance && (!vnode.data || !vnode.data.transition) // 是组件类型 Vnode && 这个 Vnode 是被 transition 包裹需要做过渡的
    ? locateNode(vnode.componentInstance._vnode) // 那么递归查找出这个组件类型 Vnode 的根元素 Vnode(如果组件根 Vnode 还是组件类型, 则递归查找)
    : vnode;
}

/**
 * v-show 通过注册指令钩子来操作 el 元素的 style 样式控制元素显示隐藏
 */
export default {
  /**
   * bind: 只调用一次，指令第一次绑定到元素时调用。 -- 在这里需要考虑这个 Vnode 元素需要过渡的情况
   *  1. 过渡元素: 过渡结束后设置 display -- value 为 true, 则设置为 __vOriginalDisplay(元素原始 display) -- value 为 false, 则设置为 'none'
   *       value 为 true, 触发进入过渡
   *       value 为 false, 则直接设置 display, 不触发过渡
   *  2. 非过渡元素: 直接设置元素的 display -- value 为 true, 则设置为 __vOriginalDisplay(元素原始 display) -- value 为 false, 则设置为 'none'
   */
  bind(
    el: any, // 指令所绑定的元素，可以用来直接操作 DOM。
    { value }: VNodeDirective, // 指令的绑定值，例如：v-my-directive="1 + 1" 中，绑定值为 2。
    vnode: VNodeWithData // Vue 编译生成的虚拟节点。
  ) {
    // 如果这个 Vnode 是一个组件类型 Vnode 并且是被 transition 包裹需要做过渡的, 那么就递归查找到这个 Vnode 组件的根元素 Vnode
    vnode = locateNode(vnode);
    // 这个 Vnode 是否需要过渡
    const transition = vnode.data && vnode.data.transition;
    // 缓存下 el 本身的 display 值, 并将其放在 el.__vOriginalDisplay 属性上
    const originalDisplay = (el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display);
    // 如果 value 值为真(表示需要显示这个 Vnode) && 需要过渡
    if (value && transition) {
      vnode.data.show = true;
      // 触发进入过渡, 在过渡结束后, 设置元素的 el.style.display
      enter(vnode, () => {
        el.style.display = originalDisplay;
      });
    } else {
      // 不需要过渡, 直接操作 display 值即可
      el.style.display = value ? originalDisplay : 'none';
    }
  },

  /**
   * update: 所在组件的 VNode 更新时调用，但是可能发生在其子 VNode 更新之前。
   *  1. 过渡元素: 都在过渡结束后设置 display -- value 为 true, 则设置为 __vOriginalDisplay(元素原始 display) -- value 为 false, 则设置为 'none'
   *     value 为 true, 触发进入过渡
   *     value 为 false,触发离开过渡
   *  2. 非过渡元素: 直接设置元素的 display -- value 为 true, 则设置为 __vOriginalDisplay(元素原始 display) -- value 为 false, 则设置为 'none'
   */
  update(
    el: any, // 指令所绑定的元素，可以用来直接操作 DOM。
    { value, oldValue }: VNodeDirective, // 新旧指令的绑定值
    vnode: VNodeWithData // Vue 编译生成的虚拟节点。
  ) {
    /* istanbul ignore if */
    if (!value === !oldValue) return; // 新旧值发生改变时才需要切换显示
    vnode = locateNode(vnode); // 与 bind 钩子中一样, 如果需要触发过渡的话, 需要找出组件类型 Vnode 的根元素类型的 Vnode
    const transition = vnode.data && vnode.data.transition; // 是否需要触发过渡
    if (transition) {
      vnode.data.show = true;
      // 如果 value 为 true, 触发进入过渡
      // 如果 value 为 false,触发离开过渡
      // 并且在过渡结束时设置 display
      if (value) {
        enter(vnode, () => {
          el.style.display = el.__vOriginalDisplay;
        });
      } else {
        leave(vnode, () => {
          el.style.display = 'none';
        });
      }
    } else {
      // 不需要触发过渡的话, 直接根据 value 赋值即可
      el.style.display = value ? el.__vOriginalDisplay : 'none';
    }
  },

  /**
   * unbind: 只调用一次，指令与元素解绑时调用。
   *  如果这个 Vnode 没有被销毁了(指令解绑不一定是 Vnode 销毁, Vnode 销毁肯定触发指令解绑), 那么将元素的 display 设置为 __vOriginalDisplay(元素原始 display)
   */
  unbind(
    el: any,
    binding: VNodeDirective,
    vnode: VNodeWithData,
    oldVnode: VNodeWithData,
    isDestroy: boolean
  ) {
    // 如果这个 Vnode 没有被销毁
    if (!isDestroy) {
      el.style.display = el.__vOriginalDisplay;
    }
  },
};
