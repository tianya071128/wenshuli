/* @flow */
// 指令就跟 class、style 等数据模块一样，都是在适当的时候执行这些钩子函数

import { emptyNode } from 'core/vdom/patch';
import { resolveAsset, handleError } from 'core/util/index';
import { mergeVNodeHook } from 'core/vdom/helpers/index';

export default {
  create: updateDirectives,
  update: updateDirectives,
  // 指令还存在 destroy 钩子 - Vnode 销毁时触发
  destroy: function unbindDirectives(vnode: VNodeWithData) {
    // 此时新 Vnode 为一个新的 Vnode
    updateDirectives(vnode, emptyNode);
  },
};

/**
 * 在 Vnode 初始化、更新、销毁的时候，执行指令的钩子(bind、inserted、update、componentUpdated、unbind)
 *  1. 提取新旧 Vnode 的 directives 指令集合
 *  2. 将新旧 Vnode 的指令集合成规范成一个对象, 并且从指令注册中提取出对应的指令钩子函数
 *       res: {
 *         'v-show': { // 当前指令需要的数据
 *           expression: 'false', // 字符串形式的指令表达式。
 *           modiries: {}, // 一个包含修饰符的对象
 *           name: 'show', // 指令名，不包括 v- 前缀。
 *           rawName: 'v-show',
 *           value: false, // 指令的绑定值
 *           def: { // 指令钩子函数 - 注册的钩子均为可选
 *             bind: function() {}, // 只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置。
 *             inserted: function() {}, // 被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。
 *             update: function() {}, // 所在组件的 VNode 更新时调用，但是可能发生在其子 VNode 更新之前。
 *             componentUpdated: function() {}, // 指令所在组件的 VNode 及其子 VNode 全部更新后调用。
 *             unbind：只调用一次，指令与元素解绑时调用。
 *           }
 *         },
 *         ...
 *       }
 *  3. 根据遍历新旧指令集合(就是上面 res 对象), 对比新旧指令来执行指令相应的钩子函数(传入一些参数给这些指令), 执行时机见下面注解
 */
function updateDirectives(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 只要新旧 Vnode 中存在 directives
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode);
  }
}

// 通过新旧 Vnode 来进行指令钩子的执行
function _update(oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode; // Vnode是否为初始阶段 -- 如果旧 Vnode 是空的 Vnode 表示为初始阶段
  const isDestroy = vnode === emptyNode; // Vnode 是否为销毁阶段 -- 如果新的 Vnode 是空的 Vnode 表示为销毁阶段

  // 规范化新旧 Vnode 的指令, 提取出指令的相关数据
  const oldDirs = normalizeDirectives(
    oldVnode.data.directives,
    oldVnode.context // 渲染这个 Vnode 的上下文组件实例
  );
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context);

  /**
   * 指令是通过注册指令钩子函数来在特定时机暴露出新旧 VNode 和 DOM 提供给用户进行操作 --- 注意的是, 这些钩子关注的是指令, 但是是与 DOM 和 Vnode 的周期紧密相关的
   *  bind：只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置。 -- 此时可能是 Vnode 的数据对象模块的 create 或 update(可能是 Vnode 已经渲染, 但是指令是初次绑定) 钩子
   *        -- 当新指令存在, 旧指令不存在时, 表示为第一次绑定到元素
   *  inserted: 被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。 -- 此时可能是 Vnode 的数据对象模块的 create 或 update(可能是 Vnode 已经渲染, 但是指令是初次绑定) 钩子
   *        -- Vnode 初始化(此时执行的是数据对象模块的 create 钩子), 通过注册到 Vnode.data.hook 的 insert 钩子中(当插入到 DOM 树中执行的钩子)达到其效果
   *        -- Vnode 不是初始化(此时 Vnode 已经渲染过, 但是指令是初次绑定), 此时直接执行钩子即可
   *  update：所在组件的 VNode 更新时调用，但是可能发生在其子 VNode 更新之前。 -- 此时对应 Vnode 数据对象的 update 钩子
   *        -- 当新旧指令都存在, 表示为指令更新阶段, 直接执行即可
   *  componentUpdated：指令所在组件的 VNode 及其子 VNode 全部更新后调用。 -- 此时对应 Vnode 数据对象的 update 钩子
   *        -- 新旧指令都存在, 但是需要注册到 Vnode.data.hook.postpatch 钩子中等待组件以及子组件全部更新完毕后再执行指令钩子
   *  unbind：只调用一次，指令与元素解绑时调用。 -- 此时对应 Vnode 数据对象的 update 和 destroy 钩子 -- 指令卸载不代表 Vnode 销毁, 但是 Vnode 销毁, 肯定表示指令需要卸载
   *        -- 旧指令存在, 新指令不存在, 执行指令解绑
   */
  /**
   * 因为 inserted 指令钩子需要 Vnode.elm 插入到 DOM 树时执行
   * 但是当 Vnode 初始化时(此时为数据对象模块的 create 钩子), 此时还没有插入到 DOM 树中, 那么就需要延迟到插入 DOM 树中
   * 通过注册到 Vnode.data.hook 的 insert 钩子中(当插入到 DOM 树中执行的钩子)达到其效果
   */
  const dirsWithInsert = [];
  /**
   * 同理, componentUpdated 指令钩子需要等待全部更新后才执行
   * 而在数据对象的 'update' 钩子中, 还没有全部更新完毕, 所以需要注册到 Vnode.data.hook 的 postpatch 钩子中等待全部等待完毕
   */
  const dirsWithPostpatch = [];

  let key, oldDir, dir;
  // 遍历新的指令集合
  for (key in newDirs) {
    oldDir = oldDirs[key];
    dir = newDirs[key];
    if (!oldDir /** 当新指令存在, 旧指令不存在, 此时表示这个指令是新插入的 */) {
      // new directive, bind 新指令，绑定
      callHook(dir, 'bind', vnode, oldVnode); // 执行指令的 bind 钩子
      if (dir.def && dir.def.inserted) {
        // 如果注册了 inserted 钩子的话, 推入到 dirsWithInsert 集合
        dirsWithInsert.push(dir);
      }
    } else {
      // existing directive, update 现有指令，更新
      dir.oldValue = oldDir.value; // 指令绑定的前一个值，仅在 update 和 componentUpdated 钩子中可用。
      dir.oldArg = oldDir.arg;
      callHook(dir, 'update', vnode, oldVnode); // 当新旧指令都存在时, 表示为更新阶段, 执行 update 钩子
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir); // 如果注册了 componentUpdated 钩子的话, 推入到集合中, 只有等到组件全部更新完毕后才执行
      }
    }
  }

  // 此时如果该 Vnode 是初始化的时候, 就需要将 inserted 指令钩子延迟到 Vnode.data.hook.insert 钩子中执行
  if (dirsWithInsert.length) {
    // 封装一下执行, 需要遍历注册的 inserted 指令钩子进行执行
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode);
      }
    };
    // 如果是初始化时, 我们需要等到这个 Vnode 插入到 DOM 中时才去执行 inserted 钩子函数
    if (isCreate) {
      // 通过注册 Vnode.data.hook.insert 钩子, 来当 Vnode 插入到 DOM 树中
      mergeVNodeHook(vnode, 'insert', callInsert);
    } else {
      // 如果这个 Vnode 已经渲染过, 表示 DOM 已经插入到 DOM树 中, 那么直接执行 inserted 钩子即可
      callInsert();
    }
  }

  // 指令更新阶段, 但是需要等待组件以及子组件全部更新完毕才能执行 componentUpdated 钩子
  // 插入到 vnode.data.hook.postpatch 钩子中等待全部更新后执行指令钩子
  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
      }
    });
  }

  // 如果不是初始化阶段
  if (!isCreate) {
    // 遍历旧指令
    for (key in oldDirs) {
      // 如果旧指令中存在, 新指令不存在, 那么就需要执行指令的 unbind 卸载钩子函数 -- 指令卸载不代表 Vnode 销毁, 但是 Vnode 销毁, 肯定表示指令需要卸载
      if (!newDirs[key]) {
        // no longer present, unbind 不再存在，解开束缚
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
      }
    }
  }
}

const emptyModifiers = Object.create(null);

/**
 * 规范化指令 - 将作用于这个指令的集合(数组)合并成一个对象, 并根据指令名称提取出指令的钩子函数
 *  res: {
 *    'v-show': { // 当前指令需要的数据
 *      expression: 'false', // 字符串形式的指令表达式。
 *      modiries: {}, // 一个包含修饰符的对象
 *      name: 'show', // 指令名，不包括 v- 前缀。
 *      rawName: 'v-show',
 *      value: false, // 指令的绑定值
 *      def: { // 指令钩子函数 - 注册的钩子均为可选
 *        bind: function() {}, // 只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置。
 *        inserted: function() {}, // 被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。
 *        update: function() {}, // 所在组件的 VNode 更新时调用，但是可能发生在其子 VNode 更新之前。
 *        componentUpdated: function() {}, // 指令所在组件的 VNode 及其子 VNode 全部更新后调用。
 *        unbind：只调用一次，指令与元素解绑时调用。
 *      }
 *    },
 *    ...
 *  }
 */
function normalizeDirectives(
  dirs: ?Array<VNodeDirective>, // 作用于这个 Vnode 的指令集合 -- 是一个数组
  vm: Component // Vnode 渲染的上下文实例
): { [key: string]: VNodeDirective } {
  const res = Object.create(null); // 创建一个纯对象
  // 如果没有指令集合, 则返回空对象
  if (!dirs) {
    // $flow-disable-line
    return res;
  }
  let i, dir;
  // 遍历这个集合
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i];
    // modifiers: 包含修饰符的对象. 例如：v-my-directive.foo.bar 中，修饰符对象为 { foo: true, bar: true }。
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers; // 不存在时设置为空对象
    }
    // 将该指令存入 res 对象
    res[getRawDirName(dir)] = dir;
    // 根据指令的名称提取出指令的钩子函数
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true);
  }
  // $flow-disable-line
  return res;
}

// 返回指令的 name
function getRawDirName(dir: VNodeDirective): string {
  return (
    // rawName: 表示这个指令在 template 模板中使用的名称: 例如 v-focus
    // 当使用 render 渲染函数, 拼接成一个 name
    dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
  );
}

// 执行指令的指定 hook 钩子
function callHook(
  dir, // 指令对象
  hook, // 钩子名称
  vnode, // 新 Vnode
  oldVnode, // 旧 Vnode
  isDestroy // Vnode 是否已经卸载 -- 指令卸载不代表 Vnode 销毁, 但是 Vnode 销毁, 肯定表示指令需要卸载
) {
  const fn = dir.def && dir.def[hook]; // 取出当前指令钩子对应的钩子函数
  if (fn) {
    try {
      // 执行指令的钩子函数
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
    } catch (e) {
      // 如果钩子函数错误的话, 那么处理这个错误
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`);
    }
  }
}
