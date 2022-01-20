/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode, { cloneVNode } from './vnode';
import config from '../config';
import { SSR_ATTR } from 'shared/constants';
import { registerRef } from './modules/ref';
import { traverse } from '../observer/traverse';
import { activeInstance } from '../instance/lifecycle';
import { isTextInputType } from 'platforms/web/util/element';

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive,
} from '../util/index';

// 空的 Vnode
export const emptyNode = new VNode('', {}, []);

const hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

/**
 * 这个方法比较关键，在这里判断 a 和 b，即新旧 Vnode 是否可以复用，可以复用直接对其进行补丁即可，否则就涉及到旧 Vnode 销毁，新 Vnode 创建
 * 主要是对异步组件的比较有些麻烦：在 SSR 上异步组件需要特殊判断，暂不知道原因
 */
function sameVnode(a, b) {
  return (
    a.key === b.key && // key 一定需要相同
    a.asyncFactory === b.asyncFactory && // 新旧 Vnode 如果是异步组件，那么新旧 Vnode 就需要是同一异步组件
    // 这一部分
    ((a.tag === b.tag && // tag 相同
    a.isComment === b.isComment && // 新旧 Vnode 要不都是空节点或注释节点，要不都不是
    isDef(a.data) === isDef(b.data) && // 新旧 Vnode 的 data 要不都不存在，要不都存在 -- 这一点待思考一下
      sameInputType(a, b)) || // 新旧 Vnode 如果是 input 元素并且需要 type 相同或相似
      (isTrue(a.isAsyncPlaceholder) && // isAsyncPlaceholder：这个参数似乎只有在 SSR 上才会存在 -- 旧的 Vnode 是一个异步组件空的 Vnode(此时表示为异步组件没有渲染组件状态) && 新的异步组件加载状态不为 error
        isUndef(b.asyncFactory.error)))
  );
}

// 比较 a 和 b 如果是 input，并且 type 类型相同或者相似
function sameInputType(a, b) {
  if (a.tag !== 'input') return true; // 如果 a 不为 input 元素，返回 true -- 为什么只判断 a 的 tag？ 因为在调用这个方法之前已经判断过 a 和 b 的 tag 是相同的
  let i;
  const typeA = isDef((i = a.data)) && isDef((i = i.attrs)) && i.type; // 获取 a 的 input 的 type
  const typeB = isDef((i = b.data)) && isDef((i = i.attrs)) && i.type; // // 获取 b 的 input 的 type
  return (
    typeA === typeB /** 两者类型 input 类型相同 */ ||
    (isTextInputType(typeA) && isTextInputType(typeB)) // typeA 和 typeB 是这几种 'text,number,password,search,email,tel,url'
  );
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  let i, key;
  const map = {};
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

// 创建 patch 方法
export function createPatchFunction(backend) {
  let i, j;
  const cbs = {};

  /**
   * modules：在 ['create', 'activate', 'update', 'remove', 'destroy'] 这些钩子期间，会传入新旧 vnode 执行下面模块的方法
   *  directives：指令模块处理，不区分平台
   *  ref：ref 模块处理，不区分平台
   *  web 端：见 platforms/web/runtime/modules
   *    - attrs：DOM 属性处理
   *    - class：class 类模块处理
   *    - dom-props:
   *    - events：事件处理
   *    - style：行内样式处理
   *    - transition
   */
  const { modules, nodeOps } = backend; // 提取出参数

  // const hooks = ['create', 'activate', 'update', 'remove', 'destroy'];
  // 我们将这些模块分成上述几个钩子，然后将其规范为指定结构：{ active: [fn1、fn2...], create: [fn1, fn2...] }，方便在某一阶段是调用
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]]);
      }
    }
  }

  // 创建一个空的 Vnode，但是会添加 elm(当前虚拟节点对应的真实dom节点) 属性
  function emptyNodeAt(elm) {
    return new VNode(
      nodeOps.tagName(elm).toLowerCase(), // 指定 DOM 节点的 tag
      {},
      [],
      undefined,
      elm
    );
  }

  // 封装一个删除 DOM 节点的函数, 只有当 listeners 记录的 remove 钩子执行完毕后才会执行删除 DOM 节点的操作
  function createRmCb(childElm, listeners) {
    // 创建一个删除 DOM 节点的函数
    function remove() {
      // 只有 listeners 标识为 0 时,才需要执行删除 DOM 节点的操作
      if (--remove.listeners === 0) {
        removeNode(childElm);
      }
    }
    remove.listeners = listeners; // 这个记录的是 remove 钩子的数量, 只有当这个钩子执行完成后才需要执行移除 DOM 的操作
    return remove;
  }

  // 删除节点
  function removeNode(el) {
    const parent = nodeOps.parentNode(el); // 找到父节点
    // element may have already been removed due to v-html / v-text 由于v-html/v-text，元素可能已被删除
    if (isDef(parent)) {
      // 删除节点
      nodeOps.removeChild(parent, el);
    }
  }

  // 如果 vnode 的 tag 不符合规则，那么返回 true
  function isUnknownElement(vnode, inVPre) {
    return (
      !inVPre && // 是否为 v-pre 元素
      !vnode.ns && // 是否为当前节点的名字空间
      !(
        config.ignoredElements.length && // config.ignoredElements：忽略某些自定义元素
        config.ignoredElements.some((ignore) => {
          return isRegExp(ignore) // 如果定义的是正则的话，使用正则验证
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag;
        })
      ) &&
      config.isUnknownElement(vnode.tag) // 检测是否为未知元素
    );
  }

  // 创建 v-pre(跳过这个元素和它的子元素的编译过程) 标识的 vnode
  // 在子组件创建时，createComponent 方法会通不过而当做普通元素渲染
  let creatingElmInVPre = 0;

  /**
   * 根据 vnode 创建 DOM -- 在初始化和更新阶段涉及到新增节点或组件时都会走这个方法
   *  根据 vnode 类型不同，创建子组件、元素节点、注释节点、文本节点
   *    创建子节点是走 createComponent 方法，
   *    而创建 DOM 节点则不需要这么麻烦，直接创建即可，创建 DOM 节点时最后根据 parentElm、refElm 两个坐标来插入节点 -- 但是注意子组件的根元素是没有坐标在这里就不会进行插入操作，而是在后面的步骤自动插入的
   *      在通过 createChildren 方法创建子节点，子节点创建也是调用 createElm 方法创建
   */
  function createElm(
    vnode, // vnode
    insertedVnodeQueue, // 队列
    parentElm, // 父节点 - DOM
    refElm, // 下个节点 - 节点坐标
    nested, //
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This v node was used in a previous render! 此vnode已在以前的渲染中使用！
      // now it's used as a new node, overwriting its elm would cause 现在它被用作一个新节点，覆盖它的elm会导致
      // potential patch errors down the road when it's used as an insertion 将其用作插入时可能出现的修补程序错误
      // reference node. Instead, we clone the node on-demand before creating 引用节点。相反，我们在创建之前按需克隆节点
      // associated DOM element for it. 与之关联的DOM元素。
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    // 根组件？
    vnode.isRootInsert = !nested; // for transition enter check 对于转换，输入check
    // 如果是渲染子组件的话，就会走下面逻辑
    if (
      createComponent(
        vnode,
        insertedVnodeQueue, // 子组件渲染队列
        parentElm, // 父节点
        refElm // 当前节点的下一个 DOM 节点
      )
    ) {
      return;
    }

    // 提取出 vnode 数据对象
    const data = vnode.data;
    // 提取出 vnode 的子节点
    const children = vnode.children;
    // 提取出 vnode 的 tag
    const tag = vnode.tag;

    // 下面是创建元素、注释、文本节点，最后根据 parentElm、refElm 两个坐标来插入节点
    // 但是注意子组件的根元素是没有坐标在这里就不会进行插入操作，而是在后面的步骤自动插入的
    if (isDef(tag) /** 如果存在 tag 的话，说明是一个元素节点 */) {
      if (process.env.NODE_ENV !== 'production') {
        // 如果这个 vnode 中存在 v-pre(跳过这个元素和它的子元素的编译过程。)
        if (data && data.pre) {
          creatingElmInVPre++; // 标识 +1  -- 渲染完这个 vnode 后会将其 -1
        }
        // 检测 tag 是否为未知元素，如果是的话，则提示一下 -- 需要注意的是如果是 v-pre 元素或存在命名空间元素就不会进行检测
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + // 未知的自定义元素：<
            tag +
            '> - did you ' + // >-是吗
            'register the component correctly? For recursive components, ' + // 正确注册组件？对于递归组件
              'make sure to provide the "name" option.', // 确保提供“名称”选项
            vnode.context
          );
        }
      }

      vnode.elm = vnode.ns // 如果是具有命名空间的元素，使用不同的方法创建元素
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode);
      // 设置 css 作用域
      setScope(vnode);

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree);
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue);
          }
          insert(parentElm, vnode.elm, refElm);
        }
        createChildren(vnode, children, insertedVnodeQueue);
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue);
          }
          insert(parentElm, vnode.elm, refElm);
        }
      } else {
        // 创建子节点
        createChildren(vnode, children, insertedVnodeQueue);
        // 如果存在 data 数据的话，执行 data 数据中的 create 钩子，初始化 class、style、attr 等数据
        if (isDef(data)) {
          // 在这里会执行表示组件 vnode 的 create 钩子，如果存在的话
          invokeCreateHooks(vnode, insertedVnodeQueue);
        }
        // 将该节点插入到指定位置中
        insert(parentElm, vnode.elm, refElm);
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--;
      }
    } else if (isTrue(vnode.isComment) /** 注释节点 */) {
      vnode.elm = nodeOps.createComment(vnode.text); // 创建一个注释节点
      // 根据 parentElm 和 refElm 作为坐标来插件到 DOM 中
      insert(parentElm, vnode.elm, refElm);
    } /** 文本节点 */ else {
      vnode.elm = nodeOps.createTextNode(vnode.text); // 创建一个文本节点
      // 插入节点
      insert(parentElm, vnode.elm, refElm);
    }
  }

  // 初始化渲染子组件的 vnode -- 是子组件 vnode 渲染的启动地方
  function createComponent(
    vnode, //
    insertedVnodeQueue, // 组件渲染队列
    parentElm, // 父节点 DOM - 和 parentElm 共同决定这个 vnode 的插入位置
    refElm // 节点的下一个 DOM 节点
  ) {
    let i = vnode.data; // 提取出数据对象
    if (isDef(i)) {
      // 缓存组件的情况
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive;

      // 如果存在表示组件 vnode 的 init 的钩子，则进行调用进入子组件的渲染过程
      // init 钩子定义在 core\vdom\create-component.js 的 componentVNodeHooks 对象上
      if (isDef((i = i.hook)) && isDef((i = i.init))) {
        // 调用完 init 钩子后继续往后执行
        i(vnode, false /* hydrating */);
      }
      // after calling the init hook, if the vnode is a child component 调用init hook之后，如果vnode是子组件
      // it should've created a child instance and mounted it. the child 它应该创建一个子实例并挂载它。孩子
      // component also has set the placeholder vnode's elm. 组件还设置了占位符vnode的elm。
      // in that case we can just return the element and be done. 在这种情况下，我们只需返回元素就可以了
      if (isDef(vnode.componentInstance)) {
        /** 如果是子组件的话，那么应该已经创建了实例 */
        initComponent(vnode, insertedVnodeQueue);
        // 将子组件插入到 DOM 树中
        insert(parentElm, vnode.elm, refElm);
        // 如果是缓存组件，。。。
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true;
      }
    }
  }

  // 除了建立 insertedVnodeQueue 队列，还做了其他工作，但是有点难以理解
  function initComponent(vnode, insertedVnodeQueue) {
    // 如果 pendingInsert 不能 undefined，表示这个组件类型 vnode 表示的 DOM 还没有挂载到 DOM 树上
    if (isDef(vnode.data.pendingInsert)) {
      // 此时需要将这个组件类型 vnode 添加进 insertedVnodeQueue 队列中，以待后续 invokeInsertHook 方法执行组件类型 vnode.insert 钩子
      // 为什么借助 apply 方法？利用 apply 特性，将 vnode.data.pendingInsert 数组每项作为单独的元素参数，拼接成一维数组
      insertedVnodeQueue.push.apply(
        insertedVnodeQueue,
        vnode.data.pendingInsert
      );
      // 重置标识
      vnode.data.pendingInsert = null;
    }
    vnode.elm = vnode.componentInstance.$el; // 取出渲染的 DOM
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue);
      setScope(vnode);
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode);
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode);
    }
  }

  function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
    let i;
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    let innerNode = vnode;
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode;
      if (isDef((i = innerNode.data)) && isDef((i = i.transition))) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode);
        }
        insertedVnodeQueue.push(innerNode);
        break;
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm);
  }

  // 在指定位置坐标 parent(父元素) 和 ref(插入位置的下一个元素) 插入 elm 节点
  function insert(parent, elm, ref) {
    // 如果父元素存在的话
    if (isDef(parent)) {
      // 如果插入位置存在下一个位置存在元素的话，就需要插入指定位置。否则直接追加到父元素的最后
      if (isDef(ref)) {
        // 还要判断一下 ref 和 parent(即 elm 的父元素) 是否具有相同的父节点
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref); // 此时插入到指定位置
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

  // 创建子节点
  function createChildren(vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children) /** 子节点是数组 */) {
      // 开发环境下，对子节点的 key 进行检测
      if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(children);
      }
      // 遍历子节点，调用 createElm 方法创建节点即可
      for (let i = 0; i < children.length; ++i) {
        createElm(
          children[i],
          insertedVnodeQueue,
          vnode.elm, // 父节点，标识位置
          null, // 当前节点的下一个节点为 null，表示直接追加到最后即可
          true, // 不是根节点
          children, // 子节点数组
          i // 当前节点在父节点的索引位置
        );
      }
    } else if (isPrimitive(vnode.text)) {
      /** 是否为原始值(string、number、symbol、boolean) */
      nodeOps.appendChild(
        vnode.elm,
        nodeOps.createTextNode(String(vnode.text)) // 追加一个文本节点
      );
    }
  }

  // 检测 vnode 的 tag 是否存在 -- 如果 tag 存在，表示元素类型 Vnode，添加事件、class、style 等才有意义
  // 对于组件类型 Vnode，我们需要递归找到到组件模板的根元素(如果组件模板也是一个组件，就需要递归查找)
  function isPatchable(vnode) {
    // 如果这个 vnode 是一个表示组件的 vnode，则 vnode.componentInstance
    while (vnode.componentInstance) {
      // vnode.componentInstance._vnode：组件元素表示的 vnode
      vnode = vnode.componentInstance._vnode;
    }
    // 找出这个 vnode 的 tag。如果是表示组件 vnode，则找出组件的根元素 tag
    return isDef(vnode.tag);
  }

  // 执行 vnode 中 data 的 create 钩子
  function invokeCreateHooks(vnode, insertedVnodeQueue) {
    // 遍历 cbs 模块中的钩子 -- cbs 是 vnode 中 data 数据对象的钩子
    for (let i = 0; i < cbs.create.length; ++i) {
      // emptyNode：空 vnode，因为这个初始化的钩子，所以以一个空的 vnode 作为 oldVnode
      cbs.create[i](emptyNode, vnode);
    }
    i = vnode.data.hook; // Reuse variable 重用变量
    if (isDef(i)) {
      // 执行 vnode 中 data.hook 的钩子 -- 一般而言，子组件时会存在该类型钩子
      if (isDef(i.create)) i.create(emptyNode, vnode);
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode);
    }
  }

  // set scope id attribute for scoped CSS. 设置作用域CSS的作用域id属性
  // this is implemented as a special case to avoid the overhead 这是作为一种特殊情况实现的，以避免开销
  // of going through the normal attribute patching process. 通过正常的属性修补过程
  /**
   * 设置 css 作用域：
   *  1. 使用 vue 文件时，通过 vue-loader 编译的话，会在组件 $options 上注入一个 _scopeId，为 DOM 添加这个 _scopeId
   *  2. 因为函数式组件是没有 content 上下文实例的. 所以会在 vnode.fnScopeId 上定义
   *  3. 对于插槽而言，。。。
   */
  function setScope(vnode) {
    let i;
    // vnode.fnScopeId -- 函数式组件的作用域id支持 -- data-v-ff279036 类似的
    // 为什么函数式组件需要放在 vnode 中，而其他组件会放在组件实例上？ -- 因为函数式组件是没有 content 上下文实例的
    if (isDef((i = vnode.fnScopeId))) {
      /** 在创建函数式组件 vnode 时会在组件 options 上提取出 _scopeId 放在 vnode.fnScopeId 上*/
      nodeOps.setStyleScope(vnode.elm, i);
    } else {
      // 其他情况，使用 vue 文件时，通过 vue-loader 编译的话，会在组件 $options 上注入一个 _scopeId
      let ancestor = vnode;
      while (ancestor) {
        // 如果如果组件实例 ancestor.context 上存在 _scopeId 的话，则为该 DOM 添加这个 _scopeId
        if (isDef((i = ancestor.context)) && isDef((i = i.$options._scopeId))) {
          nodeOps.setStyleScope(vnode.elm, i);
        }
        // vnode.parent 赋值在 core\instance\render.js 的 _render 方法最后，引用的是组件表示的 vnode，只有在组件中的根元素 VNode 表示上会存在该属性
        // 为什么需要要查找到 parent？ 因为组件根元素同时需要父组件的 _scopeId，用于在父组件中直接使用 class 时能够作用到组件根元素
        ancestor = ancestor.parent;
      }
    }
    // for slot content they should also get the scopeId from the host instance. 对于插槽内容，它们还应该从主机实例获取scopeId
    if (
      isDef((i = activeInstance)) && // 当前渲染的组件实例
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef((i = i.$options._scopeId))
    ) {
      nodeOps.setStyleScope(vnode.elm, i);
    }
  }

  // 添加 vnodes 子节点
  function addVnodes(
    parentElm, // 父 DOM 节点
    refElm, // 插入节点的下一个 DOM 节点 - 坐标位置
    vnodes, // 需要插入 vnode 集合
    startIdx, // 开始索引
    endIdx, // 结束索引
    insertedVnodeQueue // 渲染子组件队列
  ) {
    // 遍历范围渲染
    for (; startIdx <= endIdx; ++startIdx) {
      // 调用 createElm 生成子节点
      createElm(
        vnodes[startIdx],
        insertedVnodeQueue,
        parentElm,
        refElm,
        false,
        vnodes,
        startIdx
      );
    }
  }

  /**
   * 如果是组件类型 Vnode, 则执行 destroy 钩子, 进入组件的销毁
   * 对 Vnode(不管是组件类型、元素类型、文本类型) 的数据对象(class、sytle、事件等模块)执行 destroy 钩子, 这里在 web 端只有 ref、directives 模块才存在这个钩子, 其他模块不需要进行处理, 因为只要将 DOM 移除即可
   */
  function invokeDestroyHook(vnode) {
    let i, j;
    const data = vnode.data;
    if (isDef(data)) {
      // 如果是组件类型 Vnode, 则执行 destroy 钩子, 进入组件的销毁
      if (isDef((i = data.hook)) && isDef((i = i.destroy))) i(vnode);
      // 对 Vnode(不管是组件类型、元素类型、文本类型) 的数据对象(class、sytle、事件等模块)执行 destroy 钩子, 这里在 web 端只有 ref、directives 模块才存在这个钩子, 其他模块不需要进行处理, 因为只要将 DOM 移除即可
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
    }
    // 如果存在子节点, 则进行子节点的递归处理
    if (isDef((i = vnode.children))) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j]);
      }
    }
  }

  /**
   * 从 vnode 节点数组中删除节点，startIdx, endIdx 范围,这些 Vnode 可能是元素(或文本、注释)类型 Vnode、组件类型 Vnode
   *  1. 元素(或文本、注释)类型 Vnode
   *    1.1 如果存在 transition 过渡的话,需要在过渡之后才移除 DOM
   *    1.2 执行数据对象的 destroy(只有 ref、directives 模块存在) 钩子, 后续工作
   *    1.3 递归子节点, 处理子节点
   *  2. 组件类型 Vnode:
   *    2.1 与元素类型一致, 如果存在 transition 过渡的话,需要在过渡之后才移除 DOM
   *    2.2 执行 vnode.hook.destroy 钩子, 在 vnode.hook.destroy 钩子中
   *        2.2.1 不是缓存组件, 调用 $destroy() 方法进行组件销毁, 在 $destroy() 方法 中
   *          1) 执行 beforeDestroy 生命周期
   *          2) 从父组件的 $children 集合中删除自己, 保持 $children 集合正确
   *          3) 删除组件的 Watcher, 这样的话即使响应式数据改变, 该 Watcher 也不再会进行更新
   *          4) vm._data.__ob__.vmCount--???
   *          5) 通过 vm.__patch__(vm._vnode, null)[最终会调用 patch] 方法, 执行组件元素的卸载
   *              -> 注意点1: 当是 Vnode 的销毁, 在 removeVnodes 方法中也会执行元素的卸载, 但是如果手动调用 $destroy 方法的话, 就需要借助 vm.__patch__ 去卸载了
   *              -> 注意点2: 调用这个方法, 也可以让组件元素执行一遍 ref、directives 模块的 destroy 钩子，处理善后工作
   *          6) 执行 destroyed 钩子
   *          7) 通过 vm.$off() 关闭所有的实例侦听器
   *          8) 一些引用清空
   *        2.2.2 缓存组件, ...
   */
  function removeVnodes(vnodes, startIdx, endIdx) {
    // 遍历 vnodes 范围
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]; // 当前需要删除的 vnode
      if (isDef(ch)) {
        if (isDef(ch.tag) /** 元素或组件类型 Vnode */) {
          // 执行 remove 钩子 和 移除 DOM 的操作
          removeAndInvokeRemoveHook(ch);
          // 执行子组件的 vnode.hook.destroy 钩子 和 数据对象模块的 destroy 钩子 和 递归子节点 invokeDestroyHook 方法处理
          invokeDestroyHook(ch);
        } /** 文本节点 */ else {
          // Text node 文本节点
          // 文本节点直接删除
          removeNode(ch.elm);
        }
      }
    }
  }

  // 主要做了两个操作:
  //  1. 执行模块的 remove 钩子, 在 web 端, 一般只有 transition 才存在
  //  2. 在移除 DOM 之前, 我们先要处理下 transition 过渡问题 -- 移除 DOM 的操作, 根据 vnode.elm 就可以进行删除了
  function removeAndInvokeRemoveHook(vnode, rm) {
    if (
      isDef(rm) ||
      isDef(vnode.data) // vnode 中存在 data 数据对象
    ) {
      let i;
      const listeners = cbs.remove.length + 1; // 为什么要 +1? -- 后续了解 transition
      if (isDef(rm)) {
        // we have a recursively passed down rm callback 我们有一个递归传递的rm回调
        // increase the listeners count 增加 listeners 数量
        rm.listeners += listeners;
      } else {
        // directly removing 直接移除
        // 创建一个移除 DOM 节点的方法, 在这个方法内部, 只有当 listeners 记录的 remove 钩子执行完毕后才会执行删除 DOM 节点的操作
        rm = createRmCb(vnode.elm, listeners);
      }
      // recursively invoke hooks on child component root node 递归调用子组件根节点上的钩子
      if (
        isDef((i = vnode.componentInstance)) && // vnode 是一个组件类型的 Vnode
        isDef((i = i._vnode)) && // _vnode 引用组件内容生成的 vnode
        isDef(i.data)
      ) {
        // 如果是子组件, 那么递归调用这个方法
        removeAndInvokeRemoveHook(i, rm);
      }
      // 在 web 端中 remove 钩子只有 transition 才有, 只有过渡动画需要在元素卸载时执行一些操作
      // 其他的在后续处理
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm);
      }
      if (isDef((i = vnode.data.hook)) && isDef((i = i.remove))) {
        // 如果这个 Vnode 存在 remove 钩子,那么执行这个钩子并将 rm 作为回调传入
        i(vnode, rm);
      } else {
        rm();
      }
    } else {
      // 否则直接进行 DOM 节点的操作
      removeNode(vnode.elm);
    }
  }

  // 根据新旧 vnodes 子节点进行 diff 阶段 -- diff 算法待续
  function updateChildren(
    parentElm, // 父节点
    oldCh, // 旧子节点
    newCh, // 新的子节点
    insertedVnodeQueue, // 渲染子节点队列
    removeOnly // 在 <transition group> 中传入 true，最终作用在 updateChildren 方法体现
  ) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm;

    // removeOnly is a special flag used only by <transition-group> removeOnly是仅由<transition group>
    // to ensure removed elements stay in correct relative positions 确保拆下的元件保持在正确的相对位置
    // during leaving transitions 在离开过渡期间
    // 作用未知。。。
    const canMove = !removeOnly;

    // 开发环境下检测子节点的 key
    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(newCh);
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(
          oldStartVnode,
          newStartVnode,
          insertedVnodeQueue,
          newCh,
          newStartIdx
        );
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(
          oldEndVnode,
          newEndVnode,
          insertedVnodeQueue,
          newCh,
          newEndIdx
        );
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        patchVnode(
          oldStartVnode,
          newEndVnode,
          insertedVnodeQueue,
          newCh,
          newEndIdx
        );
        canMove &&
          nodeOps.insertBefore(
            parentElm,
            oldStartVnode.elm,
            nodeOps.nextSibling(oldEndVnode.elm)
          );
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        patchVnode(
          oldEndVnode,
          newStartVnode,
          insertedVnodeQueue,
          newCh,
          newStartIdx
        );
        canMove &&
          nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx))
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
        if (isUndef(idxInOld)) {
          // New element
          createElm(
            newStartVnode,
            insertedVnodeQueue,
            parentElm,
            oldStartVnode.elm,
            false,
            newCh,
            newStartIdx
          );
        } else {
          vnodeToMove = oldCh[idxInOld];
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(
              vnodeToMove,
              newStartVnode,
              insertedVnodeQueue,
              newCh,
              newStartIdx
            );
            oldCh[idxInOld] = undefined;
            canMove &&
              nodeOps.insertBefore(
                parentElm,
                vnodeToMove.elm,
                oldStartVnode.elm
              );
          } else {
            // same key but different element. treat as new element
            createElm(
              newStartVnode,
              insertedVnodeQueue,
              parentElm,
              oldStartVnode.elm,
              false,
              newCh,
              newStartIdx
            );
          }
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(
        parentElm,
        refElm,
        newCh,
        newStartIdx,
        newEndIdx,
        insertedVnodeQueue
      );
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
  }

  // 检测子节点的 key 是否重复
  function checkDuplicateKeys(children) {
    // 将子节点的 key 进行 map 结构缓存，在遍历 children，发现出现同样的 key 就提示问题
    const seenKeys = {};
    for (let i = 0; i < children.length; i++) {
      const vnode = children[i];
      const key = vnode.key;
      if (isDef(key)) {
        if (seenKeys[key]) {
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`, // 检测到重复的密钥 这可能会导致更新错误
            vnode.context
          );
        } else {
          seenKeys[key] = true;
        }
      }
    }
  }

  function findIdxInOld(node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i];
      if (isDef(c) && sameVnode(node, c)) return i;
    }
  }

  /**
   * 对比新旧 vnode 进行现有节点补丁，在这里只关注新旧 Vnode 的对比
   * 在进入这个方法之前，我们就确定了这两个 Vnode 是大致相同的，我们就需要对这个 Vnode 进行补丁
   * 1. 对于元素或文本或注释 Vnode 来讲：
   *    -> 1.1 需要调用 cbs.update 进行数据对象data(class、style、attrs等)进行更新
   *    -> 1.2 进入子节点(如果存在的话)的对比更新，这又分为几种情况，详见代码
   *    -> 1.3 如果是文本节点，还需要对文本进行更新操作
   * 2. 对于组件类型 Vnode 来讲：
   *    -> 2.1 首先调用 vnode.data.hook.prepatch 钩子，将组件 Vnode 的补丁交给这个钩子处理, 处理插槽、props、attrs、event 等响应式数据后, 根据这些数据是否改变以及子组件是否依赖了这些数据共同决定是否重新渲染子组件
   *    -> 2.2 执行 class、style、给根元素注册原生事件(使用 .native 修饰符)等模块的 update 钩子 -- 这些模块不需要响应式, 所以只需要对其子组件的根元素进行操作即可
   *    -> 2.3 注意: 子组件是没有子节点(vnode.children), 子节点是做为插槽使用的
   */
  function patchVnode(
    oldVnode, // 旧的 vnode
    vnode, // 新的 vnode
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly // 在 <transition group> 中传入 true，最终作用在 updateChildren 方法体现
  ) {
    // 如果两个 vnode 都相同就没有比较意义
    if (oldVnode === vnode) {
      return;
    }

    // 如果新的 vnode 已经被渲染过了的，重用 vnode
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode 克隆重用vnode
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    // 组件渲染成的 elm 使用旧的 -- 在调用这个方法之前就已经比较新旧 vnode 生成的 DOM 是可以复用的，所以就会 vnode.elm 的基础上进行补丁
    const elm = (vnode.elm = oldVnode.elm);

    // 不简单的是异步组件，看了一圈，只有在 SSR 上 isAsyncPlaceholder 才为 true
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
      } else {
        vnode.isAsyncPlaceholder = true;
      }
      return;
    }

    // reuse element for static trees. 重用静态树的元素。
    // note we only do this if the vnode is cloned - 注意，我们仅在克隆vnode时才执行此操作-
    // if the new node is not cloned it means the render functions have been 如果未克隆新节点，则表示已克隆渲染函数
    // reset by the hot-reload-api and we need to do a proper re-render. 通过热重新加载api重置，我们需要进行适当的重新渲染。
    if (
      isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance;
      return;
    }

    // 组件相关的钩子执行
    let i;
    const data = vnode.data;
    if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
      // 组件类型 Vnode 的补丁操作
      i(oldVnode, vnode);
    }

    // 提取出新旧的 vnode 子节点
    const oldCh = oldVnode.children;
    const ch = vnode.children;
    // 如果这个 vnode 是可复用的，就可以执行数据对象(包含指令、ref等) update 钩子，以及组件 vnode 的 update 钩子
    if (isDef(data) && isPatchable(vnode)) {
      // 执行 vnode 的 cbs 的 update 钩子
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      // 执行组件 vnode 的 update 钩子
      if (isDef((i = data.hook)) && isDef((i = i.update))) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text) /** vnode 不是一个文本节点 */) {
      if (isDef(oldCh) && isDef(ch) /** 新旧子节点都存在，进入 diff 阶段 */) {
        // 两个子节点不是相同的
        if (oldCh !== ch)
          updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); // diff 阶段
      } else if (isDef(ch) /** 新子节点存在，旧子节点不存在 */) {
        // 在这种情况下，如果旧子节点存在文本的话，清除文本，然后渲染子节点即可。创建新的子节点使用的就是 createElm 方法
        if (process.env.NODE_ENV !== 'production') {
          // 开发环境下，对子节点的 key 进行重复性检测
          checkDuplicateKeys(ch);
        }
        // 如果旧的子节点存在文本(即子节点是一个文本节点的话)
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, ''); // 将文本置为空
        // 渲染新的子节点
        addVnodes(
          elm, // 子节点的父节点 - 即当前 vnode 的 DOM 表示
          null,
          ch, // 子节点 vnode 集合
          0, // 开始索引
          ch.length - 1, // 结束索引
          insertedVnodeQueue // 正在渲染的子节点集合
        );
      } else if (isDef(oldCh) /** 旧子节点存在，新的子节点不存在 */) {
        // 删除子节点即可 -- 这里已经判断了新的 vnode 不是一个文本节点的
        removeVnodes(oldCh, 0, oldCh.length - 1);
      } else if (
        isDef(oldVnode.text) /** 新旧子节点都不存在，旧的子节点是一个文本节点 */
      ) {
        // 将文本置为 空
        nodeOps.setTextContent(elm, '');
      }
    } else if (
      oldVnode.text !==
      vnode.text /** 如果 vnode 是一个文本节点并且跟旧的文本不同 */
    ) {
      // 不管旧 vnode 节点如何，只需要用新的文本统一替换掉
      nodeOps.setTextContent(elm, vnode.text);
    }
    // 执行子组件的 postpatch 钩子，如果存在的话
    if (isDef(data)) {
      if (isDef((i = data.hook)) && isDef((i = i.postpatch)))
        i(oldVnode, vnode);
    }
  }

  /**
   * 最终实现的是将子组件的 insert 钩子延迟到元素真正插入的时刻
   * 1. 当为组件初始化时，组件渲染时 initial 标识为 true，此时就会将该组件类型 vnode 暂存进队列中
   * 2. 当为组件重渲染时，更新组件的 initial 标识为 false，此时直接调用 insert 钩子。
   *      但是在更新阶段，存在组件新创建的情况下，同样会将这个新组件及其子孙组件都添加至队列中，等待更新组件更新完毕，元素都插入到 DOM 树中开始执行
   *
   * 总结就是，只有组件已经真正插入到 DOM 树后才会执行
   */
  function invokeInsertHook(
    vnode, // vnode 表示
    queue, // 队列
    initial // true：子组件初始渲染
  ) {
    // delay insert hooks for component root nodes, invoke them after the 延迟为组件根节点插入钩子，在
    // element is really inserted 元素是真正插入的
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue;
    } else {
      for (let i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i]);
      }
    }
  }

  let hydrationBailed = false;
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

  // Note: this is a browser-only function so we can assume elms are DOM nodes. 注意：这是一个仅用于浏览器的函数，因此我们可以假设ELM是DOM节点
  function hydrate(elm, vnode, insertedVnodeQueue, inVPre) {
    let i;
    const { tag, data, children } = vnode;
    inVPre = inVPre || (data && data.pre);
    vnode.elm = elm;

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true;
      return true;
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false;
      }
    }
    if (isDef(data)) {
      if (isDef((i = data.hook)) && isDef((i = i.init)))
        i(vnode, true /* hydrating */);
      if (isDef((i = vnode.componentInstance))) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue);
        return true;
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue);
        } else {
          // v-html and domProps: innerHTML
          if (
            isDef((i = data)) &&
            isDef((i = i.domProps)) &&
            isDef((i = i.innerHTML))
          ) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (
                process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn('server innerHTML: ', i);
                console.warn('client innerHTML: ', elm.innerHTML);
              }
              return false;
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true;
            let childNode = elm.firstChild;
            for (let i = 0; i < children.length; i++) {
              if (
                !childNode ||
                !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)
              ) {
                childrenMatch = false;
                break;
              }
              childNode = childNode.nextSibling;
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (
                process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn(
                  'Mismatching childNodes vs. VNodes: ',
                  elm.childNodes,
                  children
                );
              }
              return false;
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false;
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true;
            invokeCreateHooks(vnode, insertedVnodeQueue);
            break;
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class']);
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text;
    }
    return true;
  }

  function assertNodeMatch(node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return (
        vnode.tag.indexOf('vue-component') === 0 ||
        (!isUnknownElement(vnode, inVPre) &&
          vnode.tag.toLowerCase() ===
            (node.tagName && node.tagName.toLowerCase()))
      );
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3);
    }
  }

  // 兜兜转转最终调用 __path__ 方法在这里
  /**
   * 1. 初始 new Vue({}) 组件时，最终会通过 createElm 方法创建 DOM 元素，并在内部遍历 children 子节点创建 DOM 元素并挂载到相应位置
   * 2. 更新阶段，调用 patchVnode 方法进行更新，在内部会去进行 node 层面的更新，进行 data 数据对象 update 钩子更新以及子节点的更新(能够复用的重走 patchVnode 方法)，更新阶段即可
   *
   * 这里列举几种常见的场景：
   *  1. 根组件初次渲染：进入第二个 createElm() 进入初始渲染成 DOM 过程
   *  2. 子组件初次渲染：进入第一个 createElm() 进入初始渲染成 DOM 过程
   *       - 在这里就是渲染组件的 vnode，并将生成的 DOM 挂载到 vnode.elm 上
   *       - 正式挂载到 DOM 树上是在
   *  3. 根组件和子组件的更新阶段：都是走 patchVnode 方法进行 diff 阶段
   */
  return function patch(
    oldVnode, // 旧的 Vnode -- 如果是一个 DOM，表示初始化阶段，并为一个挂载点 -- 也可能为 undefined 表示子组件初始渲染或根组件初始化没有提供挂载点
    vnode, // 新的 Vnode
    hydrating,
    removeOnly // 在 <transition group> 中传入 true，最终作用在 updateChildren 方法体现
  ) {
    // 如果新的 Vnode 不存在，旧的 oldVnode 存在，那么此时需要销毁旧的 Vnode
    // 在 vm.$destroy 中会走这一步进行组件元素的销毁
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode);
      return;
    }

    let isInitialPatch = false;
    const insertedVnodeQueue = [];

    // 如果旧的 Vnode 不存在，那么可能是：
    //  1. 子组件初始渲染
    //  2. 根组件初始化没有提供挂载点仅生成一个 DOM 使用，例如：new Vue({...}).$mount()
    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element 空装载（可能作为组件），创建新的根元素
      isInitialPatch = true;
      createElm(vnode, insertedVnodeQueue);
    } else {
      // 如果是对比阶段或者根组件初始渲染阶段或其他情况，走下面逻辑
      // 是否为真实的 DOM 节点
      const isRealElement = isDef(oldVnode.nodeType); // oldVnode.nodeType Node 节点类型

      // 更新阶段
      if (
        !isRealElement && // 是否为真实的 DOM 节点
        sameVnode(oldVnode, vnode) // 并且 oldVnode、vnode 可以复用，走补丁操作
      ) {
        // patch existing root node 修补现有根节点
        patchVnode(
          oldVnode, // 旧的 vnode
          vnode, // 新的 vnode
          insertedVnodeQueue,
          null,
          null,
          removeOnly
        );
      } else {
        // 如果旧 Vnode 参数传入的是真实的 DOM 节点
        if (isRealElement) {
          // mounting to a real element 安装到真实元素
          // check if this is server-rendered content and if we can perform 检查这是否是服务器呈现的内容，以及我们是否可以执行
          // a successful hydration. 成功的水合作用。
          // SSR 服务端相关
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR);
            hydrating = true; // 这个参数似乎在 SSR 才会具有存在意义吧
          }
          // ？？？
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true);
              return oldVnode;
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' + // 客户端呈现的虚拟DOM树不匹配
                'server-rendered content. This is likely caused by incorrect ' + // 服务器呈现的内容。这可能是由不正确的
                'HTML markup, for example nesting block-level elements inside ' + // HTML标记，例如内部嵌套块级元素
                '<p>, or missing <tbody>. Bailing hydration and performing ' + // <p>，或缺少<tbody>。白令水化与表演
                  'full client-side render.' // 完整客户端渲染。
              );
            }
          }
          // either not server-rendered, or hydration failed. 不是服务器渲染，就是 hydration 失败
          // create an empty node and replace it 创建一个空节点并替换它
          // 此时将 oldVnode 节点创建一个空 Vnode，并保存着 oldVnode 表示的 DOM 节点引用，后续 vnode 会替换掉的
          oldVnode = emptyNodeAt(oldVnode);
        }

        // replacing existing element 替换现有元件
        const oldElm = oldVnode.elm;
        const parentElm = nodeOps.parentNode(oldElm); // 找到父节点

        // create new node 创建新节点
        /** 根组件初始渲染，则会进入这里 */
        createElm(
          vnode, // vnode
          insertedVnodeQueue, // 排队队列？
          // extremely rare edge case: do not insert if old element is in a 极为罕见的边缘情况：如果旧元素位于
          // leaving transition. Only happens when combining transition + 离开过渡期。仅在合并转换时发生
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm, // 一般而言就是父节点
          nodeOps.nextSibling(oldElm) // 查找指定 node 的下一个节点
        );

        // update parent placeholder node element, recursively 递归更新父占位符节点元素
        // 待续？？？
        if (isDef(vnode.parent)) {
          let ancestor = vnode.parent;
          const patchable = isPatchable(vnode);
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor);
            }
            ancestor.elm = vnode.elm;
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor);
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert;
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]();
                }
              }
            } else {
              registerRef(ancestor);
            }
            ancestor = ancestor.parent;
          }
        }

        // destroy old node 销毁旧节点
        if (isDef(parentElm)) {
          // 删除旧节点
          removeVnodes([oldVnode], 0, 0);
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode);
        }
      }
    }

    // 如果组件已经插入到 DOM 树中，执行子组件类型 vnode 的 insert 钩子
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
    return vnode.elm;
  };
}
