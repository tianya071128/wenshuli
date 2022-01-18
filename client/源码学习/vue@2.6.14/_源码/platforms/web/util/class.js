/* @flow */
// 这个文件是用来处理 web 端 class 的
import { isDef, isObject } from 'shared/util';

/**
 * 处理 vnode 中 class 处理，最终处理成字符串表示的
 */
export function genClassForVnode(vnode: VNodeWithData): string {
  let data = vnode.data; // 提取出 data 对象
  let parentNode = vnode;
  let childNode = vnode;
  /**
   * 处理组件类型 Vnode，如果这个组件类型 Vnode 已经实例化了，说明是更新阶段，而更新阶段的话，可能不会触发子组件的更新，只需要将变更的 class 重新赋值到组件根元素即可
   * 在这里处理的就是将组件定义时的 class 和组件根元素定义的 class 进行合并处理
   * 为什么还需要递归处理？ -- 因为存在组件根元素又是一个组件的情况，此时就需要递归
   *    - 例如：<component1 class="class1"> -- 组件 component1 模板为 <component2 class="class2" /> -- 组件 component2 模板为 <div class="class3"></div>
   *         这样的话，就需要将这三个 class 都添加到 div 元素 DOM 上
   */
  while (isDef(childNode.componentInstance)) {
    // 如果这是一个组件类型 Vnode，并且已经实例化过，
    childNode = childNode.componentInstance._vnode; // 组件内容 Vnode
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data); // 合并 class
    }
  }
  /**
   * 处理根元素类型 Vnode -- 如果 parentNode.parent 存在的话，表示这个元素 Vnode 是一个组件的根元素
   * 与上述一样，我们还需要考虑组件根元素又是一个组件的情况，此时就需要递归
   */
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

// 进行 class 选项的合并 - 这里并不解析 class 为 字符串
function mergeClassData(
  child: VNodeData,
  parent: VNodeData
): {
  staticClass: string,
  class: any,
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass), // 对于静态 class，直接字符串拼接
    class: isDef(child.class) ? [child.class, parent.class] : parent.class, // 对于动态 class，直接合并成数组，后续会处理数组情况
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
