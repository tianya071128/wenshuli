/* @flow */

import { getStyle, normalizeStyleBinding } from 'platforms/web/util/style';
import {
  cached,
  camelize,
  extend,
  isDef,
  isUndef,
  hyphenate,
} from 'shared/util';

const cssVarRE = /^--/;
const importantRE = /\s*!important$/;
// 设置样式 -- 设置样式也有很多门道，并不是简单的添加值即可，nb
const setProp = (
  el, //作用 DOM
  name, // 样式名
  val // 样式值
) => {
  /* istanbul ignore if */

  if (cssVarRE.test(name) /** 如果样式名与 -- 开头 */) {
    el.style.setProperty(name, val); // 通过 style.setProperty 方法设置
  } else if (importantRE.test(val) /** 如果设置样式需要 !important */) {
    // 同样需要 通过 style.setProperty 方法设置
    el.style.setProperty(
      hyphenate(name), // 将驼峰命名的 name 修正为以 - 分隔的字符串
      val.replace(importantRE, ''), // 去除 !important 尾部标识
      'important' // 通过第三个参数添加
    );
  } else {
    // 其他情况
    const normalizedName = normalize(name); // 规范化样式名
    if (Array.isArray(val) /** 样式值为数组 */) {
      // Support values array created by autoprefixer, e.g. 支持autoprefixer创建的值数组，例如。
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize 一个接一个地设置它们，浏览器将只设置它可以识别的
      for (let i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i];
      }
    } else {
      // 其他情况，直接赋值
      el.style[normalizedName] = val;
    }
  }
};

const vendorNames = ['Webkit', 'Moz', 'ms'];

let emptyStyle;
// 规整化需要设置的样式名，通过在 DOM 的 style 对象上检测
const normalize = cached(function(prop) {
  emptyStyle = emptyStyle || document.createElement('div').style; // 重用变量，只需要创建一个 div 元素用于使用即可
  prop = camelize(prop); // 将 - 分隔字符串改成驼峰字符串
  // 该样式名不为 filter，但是存在 DOM 元素标准样式名中
  if (prop !== 'filter' && prop in emptyStyle) {
    return prop;
  }
  // 将样式名首字母大写
  const capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  // 检测是否为私有样式，通过手动添加 'Webkit', 'Moz', 'ms' 开头进行检测
  for (let i = 0; i < vendorNames.length; i++) {
    const name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name;
    }
  }
});

/**
 * 初始化或更新 DOM 的 style：
 *  1. 将 vnode.data.staticStyle 和 vnode.data.style 规范为对象形式，因为 style 后续要遍历一个个添加
 *  2. 合并新 Vnode 的 style 为一个对象 - 不管是组件类型 Vnode，还是元素类型 Vnode，最终目标就是提取出全部需要作用至目标元素的 Style
 *      1. 先提取出子组件的
 *      2. 在提取当前 Vnode
 *      3. 在提取父组件的
 *      4. 上述提取都是提取出对象，直接利用对象属性进行同属性覆盖，但是优先使用父组件的
 *       -> 例如：例如：<component1 style="fontSize: 12px"> -- 组件 component1 模板为 <component2 style="fontSize: 14px" /> -- 组件 component2 模板为 <div style="fontSize: 16px"></div>
 *          这样的话，作用到 div 元素 DOM 上就是 style="fontSize: 12px" -- 父组件优先级最高
 *  3. 遍历新旧 style，处理需要清除的 style，添加需要新增的 style
 *
 *  ？？？
 *  但是这里奇怪的是，为什么只缓存当前 Vnode 的 sytle，而没有缓存通过 getStyle 方法合并父子组件的最终 style
 *  这样在更新阶段，即使样式没有变化，还是会通过 setProp 设置属性
 */
function updateStyle(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const data = vnode.data; // 新的 Vnode 数据对象
  const oldData = oldVnode.data; // 旧的 Vnode 数据对象

  // staticStyle 和 style 概念与 class 类似，一个是静态样式(但是这个不是字符串，而是在编译期间规范为对象)，一个是动态 js 表达式求值的结果
  // 如果新旧中都没有定义 style 的话，那么就不要进行处理了
  if (
    isUndef(data.staticStyle) && // 新的数据对象中不存在 staticStyle 属性
    isUndef(data.style) && // 新的不存在 style
    isUndef(oldData.staticStyle) && // 旧的也不存在
    isUndef(oldData.style) //
  ) {
    return;
  }

  let cur, name;
  const el: any = vnode.elm; // 作用 DOM 元素 - 即 Vnode 对应的元素
  const oldStaticStyle: any = oldData.staticStyle; // 旧的 staticStyle
  const oldStyleBinding: any = oldData.normalizedStyle || oldData.style || {}; // 旧的 style -- 如果已经

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData 如果存在静态样式，则在执行 normalizeStyleData 时，样式绑定已经合并到其中
  /**
   * 这里为什么如果 oldStaticStyle 存在的话，只需要取 oldStaticStyle？
   * 因为在 normalizeStyleData 方法中，如果 Vnode.data.staticStyle 存在值的话，会将动态样式(vnode.data.style)合并至 Vnode.data.staticStyle 中
   *
   * 但是这里奇怪的是，为什么只缓存当前 Vnode 的 sytle，而没有缓存通过 getStyle 方法合并父子组件的最终 style
   * 这样在更新阶段，即使样式没有变化，还是会通过 setProp 设置属性
   */
  const oldStyle = oldStaticStyle || oldStyleBinding;

  // 如果定义的 style 是 [{...}, {...}]（数组形式只考虑对象项，其他项不考虑） 'fontSize: 28px' {...} 合并成对象形式
  const style = normalizeStyleBinding(vnode.data.style) || {};

  // store normalized style under a different key for next diff 将规格化样式存储在下一个差异的不同键下
  // make sure to clone it if it's reactive, since the user likely wants 如果它是反应性的，请确保克隆它，因为用户可能需要
  // to mutate it. 让它变异。
  // 如果这个 style 是响应式对象的话，则克隆对象（__ob__属性不可枚举就不会被克隆），否则直接引用
  vnode.data.normalizedStyle = isDef(style.__ob__) ? extend({}, style) : style; // 将其规范后的 style 赋值到 normalizedStyle 进行缓存，用于 update 使用

  // 处理当前 vnode 的 style，最后合并成一个最终需要应用的样式对象
  const newStyle = getStyle(vnode, true);

  // 遍历旧的 style，如果在新的 style 不存在，那么将其置为 ''
  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '');
    }
  }
  // 遍历新的 style，如果在旧的中不一样，那么进行新增
  for (name in newStyle) {
    cur = newStyle[name];
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string ie9 设置为null无效，必须使用空字符串
      setProp(el, name, cur == null ? '' : cur);
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle,
};
