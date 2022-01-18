/* @flow */

import { warn } from './debug';
import { observe, toggleObserving, shouldObserve } from '../observer/index';
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject,
} from 'shared/util';

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function,
};

/**
 * prop 处理工作，主要存在两个。
 * 1. 提取出 value
 *    如果父组件没有传入 value，则取 default
 *    如果 prop 定义的 type 存在 boolean，则需要特殊处理下
 * 2. 根据提取的 value 进行 type 验证，最后如果定义了 validator 自定义验证的话
 */
export function validateProp(
  key: string, // 验证 key
  propOptions: Object, // props 配置项
  propsData: Object, // 传入值
  vm?: Component // 创建函数式组件时没有 vm 实例
): any {
  const prop = propOptions[key]; // key 对应的配置
  const absent = !hasOwn(propsData, key); // 父组件是否没有传入值
  let value = propsData[key]; // 提取 prop 对应值
  // boolean casting
  const booleanIndex = getTypeIndex(Boolean, prop.type); // 判断 prop.type 是否定义了 Boolean，并且定义位置
  // 如果定义了 Boolean
  if (booleanIndex > -1) {
    /** 父组件没有传入值并且没有定义 default 默认值 */
    if (absent && !hasOwn(prop, 'default')) {
      value = false; // 默认为 false
    } else if (
      value === '' || // 如果 value 定义为 ''
      value === hyphenate(key) // 定义为 key 相同的，例如 test="test"
    ) {
      // only cast empty string / same name to boolean if 仅将空字符串/相同名称强制转换为布尔值，如果
      // boolean has higher priority 布尔值具有更高的优先级
      const stringIndex = getTypeIndex(String, prop.type); // 是否同时定义了 String
      // 没有定义 String 或者 布尔具有更高的优先级
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true; // 此时为 true
      }
    }
  }
  // check default value 检查默认值
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key);
    // since the default value is a fresh copy, 因为默认值是一个新副本
    // make sure to observe it. 一定要遵守它
    const prevShouldObserve = shouldObserve; // 保存当前是否可响应标识
    toggleObserving(true); // 将其可响应
    observe(value); // 对 value 进行深度响应式
    toggleObserving(prevShouldObserve); // 恢复标识
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props 跳过weex回收列表子组件道具的验证
    !(__WEEX__ && isObject(value) && '@binding' in value) // 这应该是 weex 相关的问题
  ) {
    assertProp(prop, key, value, vm, absent);
  }
  return value;
}

/**
 * Get the default value of a prop. 获取 prop 的默认值
 */
function getPropDefaultValue(
  vm: ?Component,
  prop: PropOptions, // prop 配置
  key: string
): any {
  // no default, return undefined 无默认值，返回 undefined
  if (!hasOwn(prop, 'default')) {
    return undefined;
  }
  const def = prop.default; // 提取定义的默认值
  // warn against non-factory defaults for Object & Array 针对对象和数组的非出厂默认值发出警告
  // 如果 def 是一个对象(不包括函数)就需要发出警告，因为如果定义默认值为对象的话，就需要定义为 function 来返回一个对象
  // why？因为后面取的默认值是直接获取的，如果直接定义对象的话，就会多个组件实例共享同一数据源
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + // Invalid default value for prop
      key +
      '": ' +
      'Props with type Object/Array must use a factory function ' + // 类型为Object/Array的道具必须使用factory函数
        'to return the default value.', // 返回默认值的步骤
      vm
    );
  }
  // the raw prop value was also undefined from previous render, 原始属性值也未从上一次渲染中定义
  // return previous default value to avoid unnecessary watcher trigger 返回以前的默认值以避免不必要的监视程序触发
  if (
    vm &&
    vm.$options.propsData &&
    vm.$options.propsData[key] === undefined && // 表示父组件没有传入 props
    vm._props[key] !== undefined // 这里表示组件已经存在当前 prop 的值，就直接从 _props 中取出，这里的数据是已经响应式了的，所以后面就不会重复响应式
  ) {
    return vm._props[key];
  }
  // call factory function for non-Function types 对非函数类型调用工厂函数
  // a value is Function if its prototype is function even across different execution context 如果一个值的原型在不同的执行上下文中都是函数，那么它就是函数
  return typeof def === 'function' && getType(prop.type) !== 'Function' // prop 定义的不是 Function 类型
    ? def.call(vm) // 此时就需要调用
    : def;
}

/**
 * Assert whether a prop is valid. 断言道具是否有效
 * 验证 prop 是否有效
 */
function assertProp(
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean // 父组件是否没有传入 prop
) {
  // 验证必填
  if (prop.required && absent) {
    warn('Missing required prop: "' + name + '"', vm); // 缺少必需的道具
    return;
  }
  // prop 的值不存在(没有传入值或没有定义默认值)，直接返回
  if (value == null && !prop.required) {
    return;
  }
  let type = prop.type; // prop 允许的类型集合
  let valid = !type || type === true; // type === true => 表示任意类型都可以，那么在下面遍历的时候，!valid 条件就不会通过，从而不会进行遍历
  const expectedTypes = [];
  if (type) {
    // 如果不是数组，组装成数组
    if (!Array.isArray(type)) {
      type = [type];
    }
    // 遍历定义的 type
    // !valid -- 如果检测通过，停止检测 -- 如果检测没有通过的话，那么就会一直检测下去
    for (let i = 0; i < type.length && !valid; i++) {
      // 检测 value 是否满足 type[i]
      const assertedType = assertType(value, type[i], vm);
      // 检测的类型推入到 expectedTypes 集合中
      expectedTypes.push(assertedType.expectedType || '');
      valid = assertedType.valid; // 是否检测通过
    }
  }

  // 如果检测列表中存在原生构造函数的话
  const haveExpectedTypes = expectedTypes.some((t) => t);
  // 并且检测没有通过，就进行报错
  if (!valid && haveExpectedTypes) {
    // getInvalidTypeMessage：检测不通过警告信息
    warn(getInvalidTypeMessage(name, value, expectedTypes), vm);
    return;
  }
  // 如果定义了 validator -- 自定义验证函数
  const validator = prop.validator;
  // 自定义验证函数进行验证
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".', // 无效的道具：道具的自定义验证程序检查失败
        vm
      );
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol|BigInt)$/;

/**
 * 检测 value 是否为 type 类型值，根据 type 类型不同，做不同的检测
 */
function assertType(
  value: any, // 检测值
  type: Function, // 类型
  vm: ?Component
): {
  valid: boolean,
  expectedType: string,
} {
  let valid;
  // 获取 type 对应的类型字符串表示
  const expectedType = getType(type);
  if (simpleCheckRE.test(expectedType) /** 是否为 simpleCheckRE 上述一种 */) {
    const t = typeof value; // 通过 typeof 就可以检测 value 对应的类型
    valid = t === expectedType.toLowerCase(); // 是否为指定类型
    // for primitive wrapper objects 对于基本包装器对象
    if (!valid && t === 'object') {
      valid = value instanceof type; // 还要检测下是否为基本包装器对象
    }
  } else if (expectedType === 'Object' /** 对象检测 */) {
    valid = isPlainObject(value);
  } else if (expectedType === 'Array' /** 数组检测 */) {
    valid = Array.isArray(value);
  } /** 其他类型检测 */ else {
    try {
      valid = value instanceof type; // 通过 instanceof 检测
    } catch (e) {
      warn(
        'Invalid prop type: "' + String(type) + '" is not a constructor', // 无效的 prop 类型  不是构造函数
        vm
      );
      valid = false;
    }
  }
  return {
    valid,
    expectedType, // 类型(定义的是构造函数)对应字符串表示
  };
}

const functionTypeCheckRE = /^\s*function (\w+)/;

/**
 * Use function string name to check built-in types, 使用函数字符串名称检查内置类型
 * because a simple equality check will fail when running 因为运行时简单的相等性检查将失败
 * across different vms / iframes. 跨不同的VM/iFrame。
 * 获取指定 fn 的内置类型，通过 fn.toString() 获取，因为通过 === 比较的话，在不同 vms/iframes 会失败
 */
function getType(fn) {
  const match = fn && fn.toString().match(functionTypeCheckRE); // 提取出内置类型的名称
  return match ? match[1] : '';
}

// 判断 a 和 b 内置类型是否相同
function isSameType(a, b) {
  return getType(a) === getType(b);
}

// 获取指定 type 类型在 expectedTypes 范围中的索引。如果不存在返回 -1
function getTypeIndex(type, expectedTypes): number {
  if (!Array.isArray(expectedTypes) /** 不是数组的情况下 */) {
    return isSameType(expectedTypes, type) ? 0 : -1; // 如果两者相同，返回 0
  }
  // 如果是数组，遍历比较，并且返回索引
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i;
    }
  }
  return -1;
}

// 获取 prop 检测失败时的报错信息
function getInvalidTypeMessage(
  name, // 定义的 rpop key
  value, // 最终获取的 value
  expectedTypes // 检测失败类型
) {
  // 报错信息
  let message =
    `Invalid prop: type check failed for prop "${name}".` + // 无效的道具：道具的类型检查失败
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`; // 预期
  const expectedType = expectedTypes[0]; // 提取出第一个类型
  const receivedType = toRawType(value); // 返回 value 的 type
  // check if we need to specify expected value 检查是否需要指定期望值
  if (
    expectedTypes.length === 1 && // 如果只检测了一个类型
    isExplicable(expectedType) && // 并且属于 string, number, boolean
    isExplicable(typeof value) && // 传入的值也是 string, number, boolean
    !isBoolean(expectedType, receivedType) // 并且 type 和传入的 value 中没有 boolean 类型
  ) {
    message += ` with value ${styleValue(value, expectedType)}`; // 具有
  }
  message += `, got ${receivedType} `;
  // check if we need to specify received value 检查是否需要指定接收值
  if (isExplicable(receivedType)) {
    message += `with value ${styleValue(value, receivedType)}.`;
  }
  return message;
}

// 规整 value
function styleValue(value, type) {
  if (type === 'String') {
    return `"${value}"`;
  } else if (type === 'Number') {
    return `${Number(value)}`;
  } else {
    return `${value}`;
  }
}

const EXPLICABLE_TYPES = ['string', 'number', 'boolean'];
// 指定 value 是否为 string, number, boolean
function isExplicable(value) {
  return EXPLICABLE_TYPES.some((elem) => value.toLowerCase() === elem);
}

// 检测传入参数列表中是否存在 boolean
function isBoolean(...args) {
  return args.some((elem) => elem.toLowerCase() === 'boolean');
}
