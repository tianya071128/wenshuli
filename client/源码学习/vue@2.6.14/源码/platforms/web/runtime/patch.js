/* @flow */

// import * as nodeOps from 'web/runtime/node-ops';
import * as nodeOps from './node-ops'; // 这个文件中存放的是 DOM 操作方法
import { createPatchFunction } from 'core/vdom/patch';
import baseModules from 'core/vdom/modules/index'; // 通用的 modules 模块处理方法 [ref, directives]
// import platformModules from 'web/runtime/modules/index';
// 这个文件存放的是 [attrs, klass, events, domProps, style, transition]，由名称可以推测出是 attr、class、style 等
import platformModules from './modules/index';

// the directive module should be applied last, after all 毕竟，指令模块应该最后应用
// built-in modules have been applied. 已应用内置模块

// 参照 https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1 vue 文档-渲染函数
// 我们定义 VNode 时，可以传入一些数据对象用来描述这个 Vnode，这些数据对象的处理就是这些 modules，例如 class、style 模块的处理方法
const modules = platformModules.concat(baseModules);

// createPatchFunction 方法不区分平台的，而 nodeOps 和 modules 就是区分平台的内容，就需要一些高阶函数内置一些参数
// 最终 __path__ 方法渲染 DOM 方法在 createPatchFunction 最后返回的地方
export const patch: Function = createPatchFunction({ nodeOps, modules });
