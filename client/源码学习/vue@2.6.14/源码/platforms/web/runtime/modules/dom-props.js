/* @flow */

import { isDef, isUndef, extend, toNumber } from 'shared/util';
import { isSVG } from 'web/util/index';

let svgContainer;

/**
 * 初始化或更新 domProps 模块：与 attrs 不同, 这个模块是通过 elm[key] 属性操作的
 *
 */
function updateDOMProps(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果新旧 vnode.data.domProps 都不存在值的话, 直接退出
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return;
  }
  let key, cur;
  // 提取 vnode 对应的 DOM -- 如果这个 Vnode 是组件类型，vnode.elm 表示就是组件根元素 DOM，不管如何，这个 el 就是需要最终附加的 DOM
  const elm: any = vnode.elm;
  const oldProps = oldVnode.data.domProps || {}; // 旧的 domProps
  let props = vnode.data.domProps || {}; // 新的 domProps
  // clone observed objects, as the user probably wants to mutate it 克隆观察到的对象，因为用户可能希望对其进行变异
  if (isDef(props.__ob__)) {
    // 不要对 __ob__ 进行操作, 在 extend 合并时, 因为 __ob__ 是不可枚举的, 所以不会被克隆
    props = vnode.data.domProps = extend({}, props);
  }

  // 遍历旧的 domProps,
  for (key in oldProps) {
    // 在新的 domProps 不存在, 则直接通过 elm[key] = '' 方式清除
    if (!(key in props)) {
      elm[key] = '';
    }
  }

  // 遍历新的 domProps
  for (key in props) {
    cur = props[key];
    // ignore children if the node has textContent or innerHTML, 如果节点具有textContent或innerHTML，则忽略子节点，
    // as these will throw away existing DOM nodes and cause removal errors /因为这些将丢弃现有的DOM节点并导致删除错误
    // on subsequent patches (#3360) 在后续修补程序上（#3360）
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) vnode.children.length = 0;
      if (cur === oldProps[key]) continue;
      // #6601 work around Chrome version <= 55 bug where single textNode 解决Chrome版本<=55缺陷，其中单个textNode
      // replaced by innerHTML/textContent retains its parentNode property 由innerHTML/textContent替换，保留其parentNode属性
      if (elm.childNodes.length === 1) {
        elm.removeChild(elm.childNodes[0]);
      }
    }

    if (key === 'value' && elm.tagName !== 'PROGRESS') {
      // store value as _value as well since
      // non-string values will be stringified
      elm._value = cur;
      // avoid resetting cursor position when value is the same
      const strCur = isUndef(cur) ? '' : String(cur);
      if (shouldUpdateValue(elm, strCur)) {
        elm.value = strCur;
      }
    } else if (
      key === 'innerHTML' &&
      isSVG(elm.tagName) &&
      isUndef(elm.innerHTML)
    ) {
      // IE doesn't support innerHTML for SVG elements
      svgContainer = svgContainer || document.createElement('div');
      svgContainer.innerHTML = `<svg>${cur}</svg>`;
      const svg = svgContainer.firstChild;
      while (elm.firstChild) {
        elm.removeChild(elm.firstChild);
      }
      while (svg.firstChild) {
        elm.appendChild(svg.firstChild);
      }
    } else if (
      // skip the update if old and new VDOM state is the same.
      // `value` is handled separately because the DOM value may be temporarily
      // out of sync with VDOM state due to focus, composition and modifiers.
      // This  #4521 by skipping the unnecessary `checked` update.
      cur !== oldProps[key]
    ) {
      // some property updates can throw
      // e.g. `value` on <progress> w/ non-finite value
      try {
        elm[key] = cur;
      } catch (e) {}
    }
  }
}

// check platforms/web/util/attrs.js acceptValue
type acceptValueElm = HTMLInputElement | HTMLSelectElement | HTMLOptionElement;

function shouldUpdateValue(elm: acceptValueElm, checkVal: string): boolean {
  return (
    !elm.composing &&
    (elm.tagName === 'OPTION' ||
      isNotInFocusAndDirty(elm, checkVal) ||
      isDirtyWithModifiers(elm, checkVal))
  );
}

function isNotInFocusAndDirty(elm: acceptValueElm, checkVal: string): boolean {
  // return true when textbox (.number and .trim) loses focus and its value is
  // not equal to the updated value
  let notInFocus = true;
  // #6157
  // work around IE bug when accessing document.activeElement in an iframe
  try {
    notInFocus = document.activeElement !== elm;
  } catch (e) {}
  return notInFocus && elm.value !== checkVal;
}

function isDirtyWithModifiers(elm: any, newVal: string): boolean {
  const value = elm.value;
  const modifiers = elm._vModifiers; // injected by v-model runtime
  if (isDef(modifiers)) {
    if (modifiers.number) {
      return toNumber(value) !== toNumber(newVal);
    }
    if (modifiers.trim) {
      return value.trim() !== newVal.trim();
    }
  }
  return value !== newVal;
}

export default {
  create: updateDOMProps,
  update: updateDOMProps,
};
