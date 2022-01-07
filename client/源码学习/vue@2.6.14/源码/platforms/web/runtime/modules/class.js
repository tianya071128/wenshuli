/* @flow */

import { isDef, isUndef } from 'shared/util';

import {
  concat,
  stringifyClass,
  genClassForVnode,
} from 'platforms/web/util/index';

// 更新(或初始化) DOM 的 class
// 策略较为简单：
//  简单讲就是将新的 vnode 中 class 最终统一规范为字符串形式，然后在改变情况下添加到 DOM 中
//  不管是创建阶段还是更新阶段都可以如此操作
function updateClass(oldVnode: any, vnode: any) {
  const el = vnode.elm; // 提取 vnode 对应的 DOM
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

  // 规范出 class 表示，最终为合法的 class 形式
  let cls = genClassForVnode(vnode);

  // handle transition classes 处理 transition 的 class
  // transition 转换过程的 class 处理
  const transitionClass = el._transitionClasses;
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass));
  }

  // set the class 设置 类
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
