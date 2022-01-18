/**
 * Not type checking this file because flow doesn't like attaching
 * properties to Elements.
 */

import { isTextInputType } from 'platforms/web/util/element';
import { looseEqual, looseIndexOf } from 'shared/util';
import { mergeVNodeHook } from 'core/vdom/helpers/index';
import { warn, isIE9, isIE, isEdge } from 'core/util/index';

/* istanbul ignore if */
if (isIE9) {
  // http://www.matts411.com/post/internet-explorer-9-oninput/
  // selectionchange 事件在文档上的当前文本选择被改变时触发。
  document.addEventListener('selectionchange', () => {
    const el = document.activeElement;
    // 因为在 IE9 中的 input 有部分不支持(仅支持输入文本和密码类型), 所以我们需要在这个事件中处理
    if (el && el.vmodel) {
      trigger(el, 'input');
    }
  });
}

/**
 * v-model 在这个指令钩子方法执行之前已经做了很多工作:
 *  1. 对于元素类型 Vnode
 *     1.1 在编译期间在 vnode.data.on 上添加 input 事件和在 vnode.data.domProps 是添加 value 属性
 *      例如: Vnode {
 *              data: {
 *                domProps: {
 *                  value: "" // 绑定属性值
 *                },
 *                on: {
 *                  input: function($event){if($event.target.composing)return; data=$event.target.value} // 这个方法为封装的方法
 *                }
 *              },
 *            }
 *      1.2 后续处理数据对象 event 和 domProps 模块时, 会给 DOM 元素添加 input 事件和 value 属性
 *
 *   2. 对于组件类型 Vnode - 并且不是在 vnode.data.directives 中有 model 这个指令, 因为通过下面的已经处理完成
 *      2.1 在编译期间在  vnode.data 上添加 model, 如下:
 *        Vnode {
 *          data: {
 *            model: {
 *              callback: function ($$v) {data=$$v},
 *              value: '123',
 *              expression: "data", // v-model 绑定的属性名称
 *            }
 *          },
 *        }
 *      2.2 在创建组件类型 Vnode 的 transformModel(core\vdom\create-component.js) 中处理组件绑定的 v-model,具体见方法注解
 */

/**
 * 在这里我们只会处理元素类型的 Vnode -- 因为组件类型 Vnode 的 v-model 并不会存在于 vnode.data.directives 中, 见上方注解
 * 主要在 inserted 钩子中处理 input 事件兼容性以及在 inserted 和 componentUpdated 钩子中处理 select 元素的问题
 */
const directive = {
  //
  /**
   * inserted：被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。
   */
  inserted(el, binding, vnode, oldVnode) {
    if (vnode.tag === 'select' /** 对于 select 元素而言 */) {
      // #6903
      if (oldVnode.elm && !oldVnode.elm._vOptions) {
        // vnode 的 postpatch 钩子: 组件及其子组件全部更新完成
        mergeVNodeHook(vnode, 'postpatch', () => {
          directive.componentUpdated(el, binding, vnode);
        });
      } else {
        setSelected(el, binding, vnode.context);
      }
      el._vOptions = [].map.call(el.options, getValue);
    } else if (
      vnode.tag === 'textarea' || // textarea 元素或者
      isTextInputType(el.type) // 或者是 input 的 'text,number,password,search,email,tel,url' 元素
    ) {
      /**
       * 缓存一下指令的修饰符, 用于后续使用
       *  .lazy - 取代 input 监听 change 事件
       *  .number - 输入字符串转为有效的数字
       *  .trim - 输入首尾空格过滤
       */
      el._vModifiers = binding.modifiers;
      // lazy 为 false, 表示监听的是 input 事件, 此时需要做一些工作处理一下元素的 input 事件问题
      if (!binding.modifiers.lazy) {
        /**
         * 下面是为了处理输入合成文本时(https://developer.mozilla.org/zh-CN/docs/Glossary/Input_method_editor), 会不断触发 input 事件的问题
         * 所以我们在开始输入合成文本时, 给该 DOM 打上 composing 标识为 true, 结束输入合成文本时, composing 置为 false
         * 这样的话, 我们就可以在 input 事件通过判断 composing 标识判断是否可以更新绑定值
         */

        // compositionstart: 文本合成系统如 input method editor（即输入法编辑器）开始新的输入合成时会触发 compositionstart 事件。
        el.addEventListener('compositionstart', onCompositionStart);
        // compositionend: 当文本段落的组成完成或取消时, compositionend 事件将被触发
        el.addEventListener('compositionend', onCompositionEnd);
        // Safari < 10.2 & UIWebView doesn't fire compositionend when Safari<10.2&UIWebView在以下情况下不启动 compositionend
        // switching focus before confirming composition choice 在确定构图选择之前切换焦点
        // this also fixes the issue where some browsers e.g. iOS Chrome 这也解决了一些浏览器（如iOS Chrome）的问题
        // fires "change" instead of "input" on autocomplete. 在自动完成时触发“更改”而不是“输入”。
        el.addEventListener('change', onCompositionEnd);
        /* istanbul ignore if */
        if (isIE9) {
          // 这里是为了处理 IE9 不兼容 input 和 compositionstart 和 compositionend 事件, 在此文件上方处理了的
          el.vmodel = true;
        }
      }
    }
  },

  componentUpdated(el, binding, vnode) {
    if (vnode.tag === 'select') {
      setSelected(el, binding, vnode.context);
      // in case the options rendered by v-for have changed, 如果v-for提供的选项已更改，
      // it's possible that the value is out-of-sync with the rendered options. 该值可能与渲染选项不同步。
      // detect such cases and filter out values that no longer has a matching 检测此类情况并过滤掉不再具有匹配的值
      // option in the DOM. DOM中的选项。
      const prevOptions = el._vOptions;
      const curOptions = (el._vOptions = [].map.call(el.options, getValue));
      if (curOptions.some((o, i) => !looseEqual(o, prevOptions[i]))) {
        // trigger change event if
        // no matching option found for at least one value
        const needReset = el.multiple
          ? binding.value.some((v) => hasNoMatchingOption(v, curOptions))
          : binding.value !== binding.oldValue &&
            hasNoMatchingOption(binding.value, curOptions);
        if (needReset) {
          trigger(el, 'change');
        }
      }
    }
  },
};

function setSelected(el, binding, vm) {
  actuallySetSelected(el, binding, vm);
  /* istanbul ignore if */
  if (isIE || isEdge) {
    setTimeout(() => {
      actuallySetSelected(el, binding, vm);
    }, 0);
  }
}

function actuallySetSelected(el, binding, vm) {
  const value = binding.value;
  const isMultiple = el.multiple;
  if (isMultiple && !Array.isArray(value)) {
    process.env.NODE_ENV !== 'production' &&
      warn(
        `<select multiple v-model="${binding.expression}"> ` +
          `expects an Array value for its binding, but got ${Object.prototype.toString
            .call(value)
            .slice(8, -1)}`,
        vm
      );
    return;
  }
  let selected, option;
  for (let i = 0, l = el.options.length; i < l; i++) {
    option = el.options[i];
    if (isMultiple) {
      selected = looseIndexOf(value, getValue(option)) > -1;
      if (option.selected !== selected) {
        option.selected = selected;
      }
    } else {
      if (looseEqual(getValue(option), value)) {
        if (el.selectedIndex !== i) {
          el.selectedIndex = i;
        }
        return;
      }
    }
  }
  if (!isMultiple) {
    el.selectedIndex = -1;
  }
}

function hasNoMatchingOption(value, options) {
  return options.every((o) => !looseEqual(o, value));
}

function getValue(option) {
  return '_value' in option ? option._value : option.value;
}

// 当开始输入合成时, 打上标识 composing 为 true
function onCompositionStart(e) {
  e.target.composing = true;
}

// 当文本段落的组成完成或取消时, 处理一下 composing 为 false, 并手动触发一下 input 事件
function onCompositionEnd(e) {
  // prevent triggering an input event for no reason 防止无故触发输入事件
  if (!e.target.composing) return; // 没有不是在输入合成文本的话
  e.target.composing = false;
  /**
   * 此时手动触发一下 input 事件,
   * 因为 input 事件的触发优先级要高, 但是 e.target.composing 标识还是为 true, 绑定值就不会被修改
   * 所以我们手动触发一下 input 事件, 让其 v-model 绑定值更新一下
   */
  trigger(e.target, 'input');
}

function trigger(el, type) {
  const e = document.createEvent('HTMLEvents');
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

export default directive;
