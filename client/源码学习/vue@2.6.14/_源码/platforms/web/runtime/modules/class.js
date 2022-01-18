/* @flow */

import { isDef, isUndef } from 'shared/util';

import {
  concat,
  stringifyClass,
  genClassForVnode,
} from 'platforms/web/util/index';

/**
 * 初始化或更新 class 模块：
 *  1. 提取出新 Vnode 的 class，并拼接成字符串形式 - 不管是组件类型 Vnode，还是元素类型 Vnode，最终目标就是提取出全部需要作用至目标元素的 Class
 *     1.1 对于组件类型 Vnode，处理组件类型 Vnode，如果这个组件类型 Vnode 已经实例化了，说明是更新阶段，而更新阶段的话，可能不会触发子组件的更新，只需要将变更的 class 重新赋值到组件根元素即可
 *          -> 在这里处理的就是将组件定义时的 class 和组件根元素定义的 class 进行合并处理
 *          -> 因为存在组件根元素又是一个组件的情况，所以就需要递归
 *          ->    - 例如：<component1 class="class1"> -- 组件 component1 模板为 <component2 class="class2" /> -- 组件 component2 模板为 <div class="class3"></div>
 *          ->         这样的话，就需要将这三个 class 都添加到 div 元素 DOM 上
 *     1.2 对于元素类型 Vnode，需要额外处理根元素类型 Vnode(如果 parentNode.parent 存在的话，表示这个元素 Vnode 是一个组件的根元素)
 *          -> 对于组件根元素 Vnode 来讲，我们需要获取到组件定义时的 class 进行合并
 *          -> 与上述一样，我们还需要考虑组件根元素又是一个组件的情况，此时就需要递归
 *  2. 与上一次合并的结果(缓存在 vnode.elm._prevClass)进行简单比较，如果发生改变，则直接覆盖 vnode.elm.class 的值
 *      不需要对每项 class 进行比对处理，直接对整个 class 字符串进行更新
 */
function updateClass(oldVnode: any, vnode: any) {
  // 提取 vnode 对应的 DOM -- 如果这个 Vnode 是组件类型，vnode.elm 表示就是组件根元素 DOM，不管如何，这个 el 就是需要最终附加的 DOM
  const el = vnode.elm;
  const data: VNodeData = vnode.data; // 提取出新的 data 数据对象
  const oldData: VNodeData = oldVnode.data; // 提取出旧的 data 数据对象
  // 查找新旧 data 中是否存在 staticClass、class，不存在的话，就什么都不做处理
  // data.staticClass：表示静态 class -- 即通过 class="class1 class2" 定义
  // data.class：表示 js 表达式获取的 class -- 即通过 :class="表达式" 定义
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) &&
    (isUndef(oldData) ||
      (isUndef(oldData.staticClass) && isUndef(oldData.class)))
  ) {
    return;
  }

  // 处理组件类型 Vnode 和元素类型 Vnode，将 staticClass 和 class 合并成字符串表示
  let cls = genClassForVnode(vnode);

  // handle transition classes 处理 transition 的 class
  // transition 转换过程的 class 处理
  const transitionClass = el._transitionClasses;
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass));
  }

  // set the class 设置类
  // 比较新旧 class 是否相同，如果不同的话，那么赋值即可
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls); // 添加 class
    el._prevClass = cls;
  }
}

export default {
  create: updateClass,
  update: updateClass,
};
