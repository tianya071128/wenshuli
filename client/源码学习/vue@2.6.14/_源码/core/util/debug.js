/* @flow */

import config from '../config';
import { noop } from 'shared/util';

export let warn = noop; // 初始化为空方法
export let tip = noop;
export let generateComponentTrace = noop; // work around flow check
export let formatComponentName = noop;

if (process.env.NODE_ENV !== 'production') {
  // 开发环境下
  const hasConsole = typeof console !== 'undefined';
  const classifyRE = /(?:^|[-_])(\w)/g;
  // 将指定 str 变成首字母驼峰命名法规则
  const classify = (str) =>
    str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, '');

  // 发出错误
  warn = (msg, vm) => {
    const trace = vm ? generateComponentTrace(vm) : ''; // 组件栈信息

    // 为 Vue 的运行时警告赋予一个自定义处理函数。
    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace); // 自定义错误处理
    } else if (
      hasConsole /** 支持 console 对象 */ &&
      !config.silent /** 不发出警告 */
    ) {
      console.error(`[Vue warn]: ${msg}${trace}`);
    }
  };

  // 发出警告提示信息
  tip = (msg, vm) => {
    if (hasConsole && !config.silent) {
      console.warn(
        `[Vue tip]: ${msg}` + (vm ? generateComponentTrace(vm) : '')
      );
    }
  };

  // 组件名 && 组件文件信息，如果存在的话 -- <DomTest> at docs/.vuepress/components/domTest.vue
  formatComponentName = (vm, includeFile) => {
    // 如果是根组件
    if (vm.$root === vm) {
      return '<Root>';
    }
    const options =
      typeof vm === 'function' && vm.cid != null
        ? vm.options
        : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm;
    let name = options.name || options._componentTag; // name 配置
    const file = options.__file; // 是否存在文件信息
    // 如果没有 name 但是存在组件定义文件信息，那么就取文件名作为 name
    if (!name && file) {
      const match = file.match(/([^/\\]+)\.vue$/);
      name = match && match[1];
    }

    return (
      (name
        ? `<${classify(name)}>`
        : `<Anonymous>`) /** 不存在的话，那么为匿名组件名 */ +
      (file && includeFile !== false ? ` at ${file}` : '') // 是否需要文件信息
    );
  };

  // 简单理解，就是将 str 复制 n 次
  const repeat = (str, n) => {
    let res = '';
    while (n) {
      if (n % 2 === 1) res += str;
      if (n > 1) str += str;
      n >>= 1;
    }
    return res;
  };

  // 生成组件调用栈信息， 如下所示
  // ---> <DomTest> at docs/.vuepress/components/domTest.vue
  //      <VAbe89326> at docs/01_前端/03_js/20_文件操作.md
  //        <Content>
  //          <Page> at node_modules/@vuepress/theme-default/components/Page.vue
  //            <Layout> at node_modules/@vuepress/theme-default/layouts/Layout.vue
  //              <GlobalLayout> at node_modules/@vuepress/core/lib/client/components/GlobalLayout.vue
  //                <Root></Root>
  generateComponentTrace = (vm) => {
    if (vm._isVue /** 标记为 Vue 实例 */ && vm.$parent /** 存在父组件 */) {
      const tree = [];
      let currentRecursiveSequence = 0;
      // 下面循环，是找出 vm 实例的组件栈，用于发出错误或警告时的组件调用栈
      while (vm) {
        if (tree.length > 0) {
          const last = tree[tree.length - 1]; // 取出最后一项
          // 当是递归调用时，只需要记录一次递归组件但是需要记录递归次数
          if (
            last.constructor ===
            vm.constructor /** 说明当前组件和子组件是同一组件，表示递归调用 */
          ) {
            currentRecursiveSequence++;
            vm = vm.$parent;
            continue;
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence]; // 表示递归调用的次数
            currentRecursiveSequence = 0; // 当递归调用结束时，重置调用记录器
          }
        }
        tree.push(vm); // 将组件推入到数组中
        vm = vm.$parent; // 递归查找父组件
      }

      return (
        '\n\nfound in\n\n' + // 发现于 \n 为换行符
        tree
          .map(
            (vm, i) =>
              `${
                i === 0
                  ? '---> '
                  : repeat(' ', 5 + i * 2) /** 空白符，格式问题 */
              }${
                Array.isArray(vm) // 如果是数组，表示为递归组件调用
                  ? `${formatComponentName(vm[0])}... (${
                      vm[1]
                    } recursive calls)` // 递归调用
                  : formatComponentName(vm)
              }`
          )
          .join('\n')
      );
    } else {
      return `\n\n(found in ${formatComponentName(vm)})`; // 发现于 ...
    }
  };
}
