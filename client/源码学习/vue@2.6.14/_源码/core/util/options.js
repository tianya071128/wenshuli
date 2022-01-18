/* @flow */
// 这个文件是用来合并配置项的，不关注其他内容
import config from '../config';
import { warn } from './debug';
import { set } from '../observer/index';
import { unicodeRegExp } from './lang';
import { nativeWatch, hasSymbol } from './env';

import { ASSET_TYPES, LIFECYCLE_HOOKS } from 'shared/constants';

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject,
} from 'shared/util';

/**
 * Option overwriting strategies are functions that handle 选项覆盖策略是处理
 * how to merge a parent option value and a child option 如何合并父选项值和子选项
 * value into the final value. 将值转换为最终值
 * 开发者可以覆盖这个选项，自定义合并策略的选项。
 */
const strats = config.optionMergeStrategies;

/**
 * Options with restrictions 有限制的选择
 */
if (
  process.env.NODE_ENV !== 'production' /** 下面选项只在开发环境用于调试使用 */
) {
  strats.el = strats.propsData = function(parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` + // 选项“${key}”只能在实例中使用
          'creation with the `new` keyword.' // 使用'new'关键字创建
      );
    }
    // 使用默认合并策略
    return defaultStrat(parent, child);
  };
}

/**
 * Helper that recursively merges two data objects together. 将两个数据对象递归合并在一起的帮助器
 */
function mergeData(to, from) {
  if (!from) return to;
  let key, toVal, fromVal;

  // 如果在支持 Symbol 环境下，提取出 from 所有的 key，包含 Symbol
  const keys = hasSymbol ? Reflect.ownKeys(from) : Object.keys(from);

  // 遍历
  for (let i = 0; i < keys.length; i++) {
    key = keys[i];
    // in case the object is already observed... 如果已经观察该对象
    if (key === '__ob__') continue;
    toVal = to[key];
    fromVal = from[key];
    if (!hasOwn(to, key) /** 如果在 to 上不存在 key */) {
      // set 一般是给响应式对象添加响应式属性
      // 但是一般情况下 to 不是响应式对象，所以只是普通的添加属性
      // 但是为什么需要使用 set 方法？ -- 可能是在某些情况下吧，待续
      set(to, key, fromVal);
    } else if (
      toVal !== fromVal && // 如果两个值不同
      isPlainObject(toVal) && // 并且都是对象
      isPlainObject(fromVal)
    ) {
      mergeData(toVal, fromVal); // 递归合并
    }
  }
  return to;
}

/**
 * Data
 * 合并 data 选项 -- 以及 provide 选项
 * 合并策略：最终尽量返回一个函数，等到需要取值时才会调用这个函数，在这个函数中，会合并两个值，以子值优先
 */
export function mergeDataOrFn(
  parentVal, // 父值
  childVal, // 子值
  vm
) {
  if (!vm /** 此时不是组件创建时 */) {
    // in a Vue.extend merge, both should be functions 检查对象是否具有Vue中的属性。扩展合并，两者都应该是函数
    if (!childVal) {
      return parentVal;
    }
    if (!parentVal) {
      return childVal;
    }
    // when parentVal & childVal are both present, 当parentVal和childVal都存在时，
    // we need to return a function that returns the 我们需要返回一个函数，该函数返回
    // merged result of both functions... no need to 两个函数的合并结果。。。没必要
    // check if parentVal is a function here because 此处检查parentVal是否为函数，因为
    // it has to be a function to pass previous merges. 它必须是传递先前合并的函数
    // 返回一个函数
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      );
    };
  } else {
    // 组件创建时，返回一个函数，等到提取出 data 时，直接调用
    // 这里只是合并，而不是进行数据操作
    return function mergedInstanceDataFn() {
      // instance merge 实例合并
      const instanceData =
        typeof childVal === 'function' ? childVal.call(vm, vm) : childVal; // 提取出子值
      const defaultData =
        typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal; // 提取出父值
      if (instanceData /** 如果存在子值的 */) {
        return mergeData(instanceData, defaultData); // 合并值
      } else {
        return defaultData; // 否则直接返回父值
      }
    };
  }
}

// 合并 data 选项的策略
strats.data = function(
  parentVal, // 父值
  childVal, // 子值
  vm
) {
  if (!vm /** 不是组件实例化时 */) {
    if (childVal && typeof childVal !== 'function' /** 子值传入值不是函数 */) {
      process.env.NODE_ENV !== 'production' &&
        warn(
          'The "data" option should be a function ' + // “data”选项应该是一个函数
          'that returns a per-instance value in component ' + // 返回组件中每个实例的值
            'definitions.', // 定义
          vm
        );

      return parentVal; // 直接返回父值，子值抛弃掉
    }
    return mergeDataOrFn(parentVal, childVal);
  }

  return mergeDataOrFn(parentVal, childVal, vm);
};

/**
 * Hooks and props are merged as arrays. hook 的合并策略
 */
function mergeHook(parentVal, childVal) {
  // 简单看就是将父和子合并成一个数组
  const res = childVal
    ? parentVal // 子值存在情况下 && 父值是否存在
      ? parentVal.concat(childVal) //
      : Array.isArray(childVal)
      ? childVal
      : [childVal] // 子值存在，父值不存在，生成一个数组数组形式
    : parentVal; // 子值不存在
  return res ? dedupeHooks(res) : res;
}

// 去除重复钩子
function dedupeHooks(hooks) {
  const res = [];
  for (let i = 0; i < hooks.length; i++) {
    // 去除重复钩子
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i]);
    }
  }
  return res;
}

// LIFECYCLE_HOOKS：生命周期钩子 -- 合并策略
LIFECYCLE_HOOKS.forEach((hook) => {
  strats[hook] = mergeHook;
});

/**
 * Assets 资产
 *
 * When a vm is present (instance creation), we need to do 当vm存在时（实例创建），我们需要执行以下操作
 * a three-way merge between constructor options, instance 构造函数选项、实例之间的三方合并
 * options and parent options. 选项和父选项
 * 资产('component', 'directive', 'filter')的合并策略：创建一个继承 parent 值的对象，这样的话同一组件配置指向的是同一对象，节省一些内存占用
 */
function mergeAssets(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null); // 创建一个 parentVal 继承链
  if (childVal /** 子选项存在 */) {
    process.env.NODE_ENV !== 'production' &&
      assertObjectType(key, childVal, vm); // 如果资产值不是对象，那么警告
    return extend(res, childVal); // 方法浅合并
  } else {
    return res; // 子选项不存在，直接返回
  }
}

// ASSET_TYPES： 'component', 'directive', 'filter' -- 资产
ASSET_TYPES.forEach(function(type) {
  strats[type + 's'] = mergeAssets;
});

/**
 * Watchers. 观察者 -- 最终形成将每个观察项的回调形成一个数组
 *
 * Watchers hashes should not overwrite one 观察者散列不应该覆盖一个
 * another, so we merge them as arrays. 另一个，所以我们将它们合并为数组
 */
strats.watch = function(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch... 围绕Firefox的对象工作。原型看
  // Firefox 对象上也存在 watch 属性，防止重复
  if (parentVal === nativeWatch) parentVal = undefined;
  if (childVal === nativeWatch) childVal = undefined;
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null); // 子选项不存在，直接返回继承父选项的
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm); // watch 选项应该是一个对象形式
  }
  if (!parentVal) return childVal; // 父选项不存在，返回子选项
  const ret = {};
  extend(ret, parentVal); // 合并父选项 -- 因为最终要形成一个数组，监听回调每个都要执行
  // 简单看，就是最终形成一个数组
  for (const key in childVal) {
    let parent = ret[key];
    const child = childVal[key];
    if (parent && !Array.isArray(parent)) {
      parent = [parent];
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child)
      ? child
      : [child];
  }
  return ret;
};

/**
 * Other object hashes. 其他对象 hash -- 对象形式的选项合并策略，props、methods、inject、computed
 * 合并成一个对象，子选项的优先级更高
 */
strats.props = strats.methods = strats.inject = strats.computed = function(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm); // 验证这些选项是一个对象
  }
  // 合并成一个对象，子选项的优先级更高
  if (!parentVal) return childVal;
  const ret = Object.create(null);
  extend(ret, parentVal);
  if (childVal) extend(ret, childVal);
  return ret;
};
strats.provide = mergeDataOrFn;

/**
 * Default strategy. 默认策略
 * 其他默认策略 -- 如果存在子选项，就取子选项，否则取父选项
 */
const defaultStrat = function(parentVal: any, childVal: any): any {
  return childVal === undefined ? parentVal : childVal;
};

/**
 * Validate component names 验证组件名称
 */
function checkComponents(options) {
  // 遍历选项的 components 选项
  for (const key in options.components) {
    validateComponentName(key); // 遍历验证
  }
}

// 验证组件名称是否合法
export function validateComponentName(name) {
  if (
    !new RegExp(
      `^[a-zA-Z][\\-\\.0-9_${
        unicodeRegExp.source // unicodeRegExp 正则表达式的文本。
      }]*$`
    ).test(name)
  ) {
    warn(
      'Invalid component name: "' + // 无效的组件名称
      name +
      '". Component names ' + // 组件名称
        'should conform to valid custom element name in html5 specification.' // 应符合html5规范中的有效自定义元素名称
    );
  }
  if (
    isBuiltInTag(name) /** 检测是否为内置标签 slot,component */ ||
    config.isReservedTag(name) /** 检测是否为合法平台标签 */
  ) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' + // 不要将内置或保留的HTML元素用作组件
      'id: ' + // id：
        name
    );
  }
}

/**
 * Ensure all props option syntax are normalized into the 确保将所有props选项语法规范化为
 * Object-based format. 基于对象的格式
 * 将 props 规范化为对象格式：{ type: xxx, ... }，这里不做 props 的值操作(值校验、取默认值等)
 */
function normalizeProps(options, vm) {
  const props = options.props;
  if (!props) return; // 如果不存在 props，退出
  const res = {};
  let i, val, name;
  if (Array.isArray(props) /** 数组形式 */) {
    i = props.length;
    // 遍历数组
    while (i--) {
      val = props[i];
      if (typeof val === 'string' /** 如果数组项为字符串 */) {
        name = camelize(val); // 将 - 分隔字符串改成驼峰字符串，例如：demo-test => demoTest
        res[name] = {
          type: null, // 类型任意
        };
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.'); // 使用数组语法时，道具必须是字符串
      }
    }
  } else if (isPlainObject(props) /** 严格对象形式 */) {
    for (const key in props) {
      val = props[key];
      name = camelize(key); // 将 - 分隔字符串改成驼峰字符串，例如：demo-test => demoTest
      res[name] = isPlainObject(val) ? val : { type: val };
    }
  } else if (process.env.NODE_ENV !== 'production' /** 不是对象或数组形式 */) {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` + // 选项“props”的值无效：应为数组或对象
        `but got ${toRawType(props)}.`, // 但是得到
      vm
    );
  }
  options.props = res; // 直接改变入参，因为 options 是一个引用类型，所以会改变入参
}

/**
 * Normalize all injections into Object-based format 将所有 injections 规范化为基于对象的格式
 * 与 props 同理，规范化为对象格式： { ... }
 */
function normalizeInject(options, vm) {
  const inject = options.inject;
  if (!inject) return; // 如果没有定义 inject，直接返回
  const normalized = (options.inject = {}); // 又来一种形式，直接修改 normalized 变量同样会修改 options.inject
  if (Array.isArray(inject) /** 数组形式 */) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] };
    }
  } else if (isPlainObject(inject) /** 对象形式 */) {
    for (const key in inject) {
      const val = inject[key];
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` + // 选项“inject”的值无效：应为数组或对象
        `but got ${toRawType(inject)}.`, // 但是得到
      vm
    );
  }
}

/**
 * Normalize raw function directives into object format. 将原始函数指令规范化为对象格式
 */
function normalizeDirectives(options) {
  const dirs = options.directives;
  if (dirs /** 存在指令定义的话 */) {
    for (const key in dirs) {
      const def = dirs[key];
      if (typeof def === 'function' /** 如果是函数简写形式 */) {
        dirs[key] = { bind: def, update: def };
      }
    }
  }
}

// 判断资产的 value 是否为对象形式
function assertObjectType(name, value, vm) {
  if (!isPlainObject(value) /** value 不是对象的话 */) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` + // 选项的值无效
        `but got ${toRawType(value)}.`, // 但是得到
      vm
    );
  }
}

/**
 * Merge two option objects into a new one. 将两个选项对象合并为一个新对象
 * Core utility used in both instantiation and inheritance. 用于实例化和继承的核心实用程序
 * 合并配置项，合并策略：这些是默认行为，如果开发者自定义了 config.optionMergeStrategies 合并策略的话，优先使用
 *  1. 合并 extends、mixins：直接将 mixins、extends 与 parent 进行递归 mergeOptions 合并，形成新的 parent
 *  2. 合并 data 、provide 选项：最终尽量返回一个函数，等到需要取值时才会调用这个函数，在这个函数中，会合并两个值，以子值优先
 *  3. 合并生命周期钩子：合并成一个无重复项的数组
 *  4. 合并资产('component', 'directive', 'filter')：创建一个继承 parent 值的对象，这样的话同一组件配置指向的是同一对象，节省一些内存占用
 *  5. 合并 watch：最终形成将每个观察项的回调形成一个数组
 *  6. 合并 props、methods、inject、computed：合并成一个对象，子选项的优先级更高
 *  7. 其他默认策略 -- 如果存在子选项，就取子选项，否则取父选项
 */
export function mergeOptions(
  parent, // 父
  child, // 子
  // 什么时候不存在 vm 实例？ -- 在通过 extend 扩展子类，或者 mixins 等情况都不会存在 vm 实例
  // 需要注意的是，创建子组件的时候，不会直接创建，会先通过 extend 将 options 已经合并的，此时也没有 vm 实例
  vm
) {
  if (process.env.NODE_ENV !== 'production' /** 开发环境 */) {
    checkComponents(child);
  }

  // 待续
  if (typeof child === 'function') {
    child = child.options;
  }

  // 规范化 props inject directives 选项，最终形成一个标准的格式
  // 只需要规范 child 子 options，因为 parent 已经规范好了的
  normalizeProps(child, vm);
  normalizeInject(child, vm);
  normalizeDirectives(child); // 规范化指令

  // Apply extends and mixins on the child options, 在子选项上应用扩展和混合
  // but only if it is a raw options object that isn't 但前提是它是一个原始选项对象，而不是
  // the result of another mergeOptions call. 另一次 mergeOptions 调用的结果
  // Only merged options has the _base property. 只有合并的选项具有 _base 属性
  // 什么时候会添加 _base？ -- 在 code/global-api/idnex.js 中才会添加到 Vue.options._base 中，
  // 应该可以简单理解为：存在 _base 属性的话，表明已经合并过 extends、mixins 了。
  // 这就是合并 extends、mixins 的逻辑，直接将 mixins、extends 与 parent 进行递归 mergeOptions 合并，形成新的 parent
  if (!child._base) {
    // 递归合并 extends
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm);
    }
    // 递归合并 mixins
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm);
      }
    }
  }

  const options = {};
  let key;
  // 遍历 parent
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    // 合并父选项上不存在的选项
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  // 合并选项
  function mergeField(key) {
    const strat = strats[key] || defaultStrat; // 策略模式，取出合并策略，如果没有的话就取默认合并策略
    options[key] = strat(parent[key], child[key], vm, key); // 调用合并策略进行合并
  }
  return options;
}

/**
 * Resolve an asset. 处置资产
 * This function is used because child instances need access 使用此函数是因为子实例需要访问
 * to assets defined in its ancestor chain. 到在其祖先链中定义的资产
 * 提取指定的资产(组件、指令、过滤器)
 *  策略：
 *    首先尝试从局部注册(局部注册的就在 vm.$options[type] 对象本身上查找)
 *    然后在通过原型链继承，从 mixin、extend、全局注册 上查找，因为在合并选项时，这些资源注册的都会通过原型链继承，见 mergeAssets 合并方法
 */
export function resolveAsset(
  options, // 组件的配置项
  type, // 提取类型
  id, // 提取 id
  warnMissing // 是否需要在没有找到资产情况下抱错提示
) {
  /* istanbul ignore if */
  // id 必须为字符串
  if (typeof id !== 'string') {
    return;
  }
  const assets = options[type]; // 先尝试从组件配置的资源中提取
  // check local registration variations first 首先检查本地注册变更
  if (hasOwn(assets, id)) return assets[id]; // 检测是否局部注册是否存在，存在则返回
  const camelizedId = camelize(id); // 将 id 字符串尝试从 - 分隔字符串改成驼峰字符串
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]; // 再次尝试局部注册的
  const PascalCaseId = capitalize(camelizedId); // 从 camelizedId 基础上字符串首字母大写
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]; // 再次尝试
  // fallback to prototype chain 回退到原型链
  // 回退到原型链上尝试 -- 此时通过 mixin、extend、全局注册的都是会通过继承的方式在 vm.$options 上
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
  // 没有找到的话，提示一下
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn('Failed to resolve ' + type.slice(0, -1) + ': ' + id, options);
  }
  return res;
}
