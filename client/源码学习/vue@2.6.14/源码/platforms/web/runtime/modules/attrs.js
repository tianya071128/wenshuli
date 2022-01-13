/* @flow */

import { isIE, isIE9, isEdge } from 'core/util/env';

import { extend, isDef, isUndef } from 'shared/util';

import {
  isXlink,
  xlinkNS,
  getXlinkProp,
  isBooleanAttr,
  isEnumeratedAttr,
  isFalsyAttrValue,
  convertEnumeratedValue,
} from 'platforms/web/util/index';

/**
 * 初始化或更新 DOM 的 atrrs：
 *  1. 从新旧的 Vnode 中提取出 attrs 属性，在编译阶段这个属性就会编译成对象
 *  2. 直接遍历新旧 attrs，处理需要清除的属性，修改(或新增)需要的属性
 *
 *  注意：这里与 class、style 不同，这里不会考虑提取出当前 Vnode 的父子组件的 class、style 进行合并处理，可能会出现这样的问题(概念应该比较低)
 *    例如：使用组件 <my-component id="flag ? 'foo1' : 'foo2'" />，组件模板 <div :id="flag ? 'foo3' : 'foo4'"></div> -- flag 都为 true
 *     - 在组件初始化时 id 属性值是 foo1
 *     - 如果组件中 flag 变为 false，那么 id 属性值变为 foo3 -- 此时并不会与父组件的 id 值进行比较
 *
 *  注意点2：在组件类型 Vnode 中，如果定义的 attrs 会组件的 props，那么在创建组件类型 Vnode 时(在 core\vdom\create-component.js 的 createComponent 中)，
 *          从 attrs 提取出了 prop，将会将 attrs 对应的 prop 需要从 attrs 中删除
 *          也就是说，不管是组件类型 Vnode，还是元素 Vnode，vnode.data.attrs 中的值就是需要作用到真实 DOM 元素上的
 */
function updateAttrs(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const opts = vnode.componentOptions; // 表示这是一个组件类型 Vnode，为什么不通过 vnode.componentInstance 判断？因为后续还要使用这个变量
  /**
   * 如果这个 Vnode 是组件类型，并且这个组件配置了 inheritAttrs 为 false，则直接退出
   * inheritAttrs 配置：默认为 true，将不被认作 props 的 attribute 绑定 (attribute bindings) 将会“回退”且作为普通的 HTML attribute 应用在子组件的根元素上。
   */
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return;
  }
  // 新旧 Vnode 上不存在 attrs 属性时
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return;
  }
  let key, cur, old;
  const elm = vnode.elm; // 最终作用的 DOM
  const oldAttrs = oldVnode.data.attrs || {}; // 旧 attrs
  let attrs: any = vnode.data.attrs || {}; // 新 attrs
  // clone observed objects, as the user probably wants to mutate it 克隆观察到的对象，因为用户可能希望对其进行变异
  if (isDef(attrs.__ob__)) {
    // 如果 attrs 为响应数据，那么就克隆这个对象，__ob__属性不可枚举就不会被克隆
    attrs = vnode.data.attrs = extend({}, attrs);
  }

  // 遍历新的 attrs，如果值不同的话，那么设置新的 attrs
  for (key in attrs) {
    cur = attrs[key]; // 新值
    old = oldAttrs[key]; // 旧值
    if (old !== cur) {
      // 新旧不同，则设置属性
      setAttr(elm, key, cur, vnode.data.pre /** 这个 vnode 是 v-pre */);
    }
  }
  // #4391: in IE9, setting type can reset value for input[type=radio] 在IE9中，设置类型可以重置输入值[type=radio]
  // #6666: IE/Edge forces progress value down to 1 before setting a max IE/Edge在设置最大值之前将进度值强制降为1
  /* istanbul ignore if */
  // 在 IE/Edge 上，如果存在 value 属性并且新旧值不同，需要重新设置值？与上面重新赋值有何区别？
  if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value); // ？？
  }
  // 遍历旧的 attrs，如果在新的 attrs 不存在，则进行删除操作
  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key) /** 判断属性是否为 xlink: 开头 */) {
        // 属性为 xlink: 似乎是 svg
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else if (!isEnumeratedAttr(key)) {
        // 属性不是 'contenteditable,draggable,spellcheck'，那如果是 'contenteditable,draggable,spellcheck' 呢？
        elm.removeAttribute(key); // 使用 removeAttribute 删除属性
      }
    }
  }
}

// 设置属性值 - 需要考虑多重因素
function setAttr(
  el: Element,
  key: string,
  value: any,
  isInPre: any /** v-pre 静态编译 vnode */
) {
  if (
    isInPre || // 此时如果是 v-pre 静态编译
    el.tagName.indexOf('-') > -1 // 应该是表示这个 el
  ) {
    baseSetAttr(el, key, value);
  } else if (
    isBooleanAttr(key) /** 检测属性是否为布尔类型属性，例如：checked、hidden */
  ) {
    // set attribute for blank value 设置空白值的属性
    // e.g. <option disabled>Select one</option>
    if (isFalsyAttrValue(value)) {
      // 在这个属性为布尔值类型，并且这个属性值为 null 或 false，此时需要删除这个属性
      el.removeAttribute(key);
    } else {
      // technically allowfullscreen is a boolean attribute for <iframe>, 从技术上讲，allowfullscreen是<iframe>的布尔属性，
      // but Flash expects a value of "true" when used on <embed> tag 但是Flash在<embed>标记上使用时需要一个“true”值
      value =
        key === 'allowfullscreen' && el.tagName === 'EMBED' ? 'true' : key;
      el.setAttribute(key, value); // 设置值
    }
  } else if (
    isEnumeratedAttr(key) // 判断属性是否 'contenteditable,draggable,spellcheck'
  ) {
    // 设置值，因为 'contenteditable,draggable,spellcheck' 这些属性比较特殊
    el.setAttribute(key, convertEnumeratedValue(key, value));
  } else if (isXlink(key) /** 为 xlink: 开头，应该是 svg 元素属性 */) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    // 其他的话，设置值
    baseSetAttr(el, key, value);
  }
}

// 基础的设置属性方法
function baseSetAttr(el, key, value) {
  if (isFalsyAttrValue(value)) {
    /** 检测属性值是否为 null 或 false -- 此时这个属性应该进行删除 */
    el.removeAttribute(key);
  } else {
    // #7138: IE10 & 11 fires input event when setting placeholder on IE10&11在打开占位符时触发输入事件
    // <textarea>... block the first input event and remove the blocker <textarea>。。。阻止第一个输入事件并移除阻止程序
    // immediately. 马上。
    /* istanbul ignore if */
    if (
      isIE && // IE
      !isIE9 && // 不是 IE9
      el.tagName === 'TEXTAREA' && // 是否为 <textarea> 元素
      key === 'placeholder' && // 设置属性为 placeholder
      value !== '' &&
      !el.__ieph
    ) {
      const blocker = (e) => {
        e.stopImmediatePropagation(); // 阻止监听同一事件的其他事件监听器被调用。
        el.removeEventListener('input', blocker);
      };
      el.addEventListener('input', blocker); // 如果设置的是 placeholder，在设置属性时会触发 input 事件，阻止一下
      // $flow-disable-line
      el.__ieph = true; /* IE placeholder patched IE占位符补丁 */
    }
    // 设置属性值
    el.setAttribute(key, value);
  }
}

export default {
  create: updateAttrs,
  update: updateAttrs,
};
