/* @flow */
// 这个文件是用来处理 web 端 class 的
import { isDef, isObject } from 'shared/util';

// 处理 vnode 中 class 处理，最终处理成字符串表示的
export function genClassForVnode(vnode: VNodeWithData): string {
  let data = vnode.data; // 提取出 data 对象
  let parentNode = vnode;
  let childNode = vnode;
  // 什么时候这个 vnode 是一个组件 vnode 呢？可能是这个组件的模板就是一个组件，例如: <template><App></App></template>
  // 有点难理解，待定
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode;
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data);
    }
  }
  // 将组件 vnode 的 class 转移到组件的根元素上
  // 例如 <my-componets class="xxx" /> 这个 class 就需要转移到组件的根元素上
  // 为什么需要递归呢？ -- 因为可能会存在类似 高阶组件(HOC) 的组件，则组件定义就是一个组件
  // <template><App></App></template> -- 像这样的话
  while (isDef((parentNode = parentNode.parent))) {
    if (parentNode && parentNode.data) {
      // 如果存在的话，那么就将两个合并起来
      data = mergeClassData(data, parentNode.data);
    }
  }
  // data.staticClass：表示静态 class -- 即通过 class="class1 class2" 定义
  // data.class：表示 js 表达式获取的 class -- 即通过 :class="表达式" 定义
  return renderClass(data.staticClass, data.class);
}

function mergeClassData(
  child: VNodeData,
  parent: VNodeData
): {
  staticClass: string,
  class: any,
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class) ? [child.class, parent.class] : parent.class,
  };
}

// 将 staticClass、dynamicClass 拼接成合法的 DOM class 表示
export function renderClass(staticClass: ?string, dynamicClass: any): string {
  // 只要两种 class 中存在一类
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass));
  }
  /* istanbul ignore next */
  return '';
}

// 拼接字符串形式 a b 的 class
export function concat(a: ?string, b: ?string): string {
  return a ? (b ? a + ' ' + b : a) : b || '';
}

// 将 js 表达式形式的 class 拼接成字符串形式。根据 js 表达式不同交由不同的策略处理
export function stringifyClass(value: any): string {
  if (Array.isArray(value) /** 数组形式 */) {
    return stringifyArray(value); // 返回拼接好的字符串 class 表示
  }
  if (isObject(value) /** 对象形式 */) {
    return stringifyObject(value); // 返回拼接好的字符串 class 表示
  }
  if (typeof value === 'string' /** 字符串形式 */) {
    return value; // 直接返回
  }
  /* istanbul ignore next */
  return '';
}

// 将数组形式的 :class=['a', 'b'] -- 拼接成 'a b'
function stringifyArray(value: Array<any>): string {
  let res = '';
  let stringified;
  // 遍历数组
  for (let i = 0, l = value.length; i < l; i++) {
    // 通过 stringifyClass 生成数组每一项的 class 字符串表示
    if (isDef((stringified = stringifyClass(value[i]))) && stringified !== '') {
      if (res) res += ' ';
      res += stringified; // 进行拼接
    }
  }
  return res;
}

// 将对象形式的 :class={a: false, b: true} -- 拼接成 b 形式
function stringifyObject(value: Object): string {
  let res = '';
  // 遍历对象
  for (const key in value) {
    // 这里不像数组，对象形式不需要考虑属性值的问题，只需要根据属性值的 boolean 属性来判断这个 class 是否需要应用
    if (value[key]) {
      if (res) res += ' ';
      res += key;
    }
  }
  return res;
}
