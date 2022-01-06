/* @flow */

import { isDef, isUndef } from 'shared/util';

import {
  concat,
  stringifyClass,
  genClassForVnode,
} from 'platforms/web/util/index';

// 更新 DOM 的 class
function updateClass(oldVnode: any, vnode: any) {
  const el = vnode.elm; // 提取 vnode 对应的 DOM
  const data: VNodeData = vnode.data; // 提取出新的 data 数据对象
  const oldData: VNodeData = oldVnode.data; // 提取出旧的 data 数据对象
  // 查找新旧 data 中是否存在 staticClass、class，不存在的话，就什么都不做处理
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) &&
    (isUndef(oldData) ||
      (isUndef(oldData.staticClass) && isUndef(oldData.class)))
  ) {
    return;
  }

  let cls = genClassForVnode(vnode);

  // handle transition classes
  const transitionClass = el._transitionClasses;
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass));
  }

  // set the class
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls);
    el._prevClass = cls;
  }
}

export default {
  create: updateClass,
  update: updateClass,
};
