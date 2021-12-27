/* @flow */

import config from '../config';
import Watcher from '../observer/watcher';
import Dep, { pushTarget, popTarget } from '../observer/dep';
import { isUpdatingChildComponent } from './lifecycle';

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving,
} from '../observer/index';

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling,
} from '../util/index';

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop,
};

// 代理 - 将对 target 的属性访问映射到 sourceKey 上
export function proxy(target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  // 通过 Object.defineProperty 进行代理
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

export function initState(vm: Component) {
  vm._watchers = []; // 组件的观察者集合
  const opts = vm.$options; // 提取出配置项
  /**
   * 首先初始化 props，这里只是在创建组件时初始化 props，更新阶段在其他地方
   *  1. 首先提取 props 值，并且进行校验。
   *  2. 通过 defineReactive 响应式添加到 props(vm._props) 上，如果在更新阶段修改 prop 的话，就会触发依赖更新从而更新组件
   *  3. 通过代理模式，将 prop 的 key 代理到 vm 实例上，这样的话，通过 this[propKey] 访问的话，就相当于访问 _props
   */
  if (opts.props) initProps(vm, opts.props);
  /**
   * 初始化 methods
   * 首先进行验证，不能定义为非函数，不能与 prop 定义重复，不能定义已经在实例上并且以 _、$ 开头的名称
   * 然后直接将其添加到 vm 实例上
   */
  if (opts.methods) initMethods(vm, opts.methods);
  if (opts.data) {
    initData(vm);
  } else {
    // 如果没有定义 data 的话
    observe((vm._data = {}), true /* asRootData */);
  }
  if (opts.computed) initComputed(vm, opts.computed);
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}

/**
 * 在组件创建阶段初始化 props，组件更新阶段 props 在其他地方
 *  1. 提取 value 并且校验 props
 *  2. 通过 defineReactive 响应式添加到 props(vm._props) 上，如果在更新阶段修改 prop 的话，就会触发依赖更新从而更新组件
 *  3. 通过代理模式，将 prop 的 key 代理到 vm 实例上，这样的话，通过 this[propKey] 访问的话，就相当于访问 _props
 */
function initProps(
  vm: Component,
  propsOptions: Object /** 组件配置的 props */
) {
  // 组件接收到的 props -- 即父组件注入的 props
  const propsData = vm.$options.propsData || {};
  // 将处理的 props 添加到 _props 属性上
  const props = (vm._props = {});
  // cache prop keys so that future props updates can iterate using Array 缓存道具密钥，以便将来道具更新可以使用数组进行迭代
  // instead of dynamic object key enumeration. 而不是动态对象键枚举
  // 在这里只是初始化 props，如果在组件更新阶段，后续只需要遍历 _propKeys 而不是枚举对象。 -- 难道是性能会提升？
  const keys = (vm.$options._propKeys = []); // 使用 _propKeys 缓存 key？
  const isRoot = !vm.$parent; // 是否为根组件
  // root instance props should be converted 应转换根实例道具
  /** 如果不是根组件的话，那么就不要进行深度响应。*/
  // 那么就是说根组件就需要深度响应，因为根组件的 propsData(创建实例时传递 props。主要作用是方便测试。) 是方便测试用的，所以需要深度响应
  // 而父组件传入的话,就需要由父组件决定是否为传入响应数据
  if (!isRoot) {
    toggleObserving(false);
  }
  // 遍历
  for (const key in propsOptions) {
    keys.push(key); // 缓存键
    // 验证 prop 并且提取出 value 值
    const value = validateProp(key, propsOptions, propsData, vm);
    // 通过 defineReactive 将 key 添加到 vm._props(与 props 同一引用) 上
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key); // 将 key 转化为连字符
      if (
        isReservedAttribute(hyphenatedKey) || // 检查属性是否为保留属性 key,ref,slot,slot-scope,is
        config.isReservedAttr(hyphenatedKey) // 检测 key 是否符合平台标准
      ) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`, // 是保留属性，不能用作组件属性
          vm
        );
      }
      defineReactive(props, key, value, () => {
        if (
          !isRoot /** 不是根组件 */ &&
          !isUpdatingChildComponent /** 是否为组件更新阶段 */
        ) {
          warn(
            `Avoid mutating a prop directly since the value will be ` + // 避免直接改变 prop，因为该值将
            `overwritten whenever the parent component re-renders. ` + // 每当父组件重新渲染时覆盖
            `Instead, use a data or computed property based on the prop's ` + // 相反，使用基于道具属性的数据或计算属性
              `value. Prop being mutated: "${key}"`, // value. 正在变异的支柱
            vm
          );
        }
      });
    } else {
      defineReactive(props, key, value);
    }
    // static props are already proxied on the component's prototype 静态道具已经在组件的原型上代理
    // during Vue.extend(). We only need to proxy props defined at 在 Vue.extend() 期间。我们只需要代理在上定义的道具
    // instantiation here. 此处实例化
    if (!(key in vm)) {
      // 将 prop 的 key 代理到 vm 实例上，这样的话，通过 this[propKey] 访问的话，就相当于访问 _props
      proxy(vm, `_props`, key);
    }
  }
  toggleObserving(true); // 允许响应式
}

/**
 * 初始化 data
 */
function initData(vm: Component) {
  let data = vm.$options.data; // 提取 data 配置
  // 从 data 配置项中提取 data，一般而言，会调用其在合并配置项时生成的 data 函数
  data = vm._data = typeof data === 'function' ? getData(data, vm) : data || {};
  // data 返回值必须是一个严格对象
  if (!isPlainObject(data)) {
    data = {}; // 重置为一个对象
    process.env.NODE_ENV !== 'production' &&
      warn(
        'data functions should return an object:\n' + // 数据函数应该返回一个对象
          'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
        vm
      );
  }
  // proxy data on instance 实例上的代理数据
  const keys = Object.keys(data); // 所有定义的 key
  const props = vm.$options.props; // 定义的 props
  const methods = vm.$options.methods; // 定义的 methods
  let i = keys.length;
  // 遍历
  while (i--) {
    const key = keys[i];
    // 不能与 methods 上定义的方法一致
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`, // 已定义为数据属性
          vm
        );
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' &&
        warn(
          `The data property "${key}" is already declared as a prop. ` + // 数据属性 key 已声明为 prop
            `Use prop default value instead.`, // 改为使用默认值
          vm
        );
    } else if (!isReserved(key) /** 不能以 _ 或 $ 开头 */) {
      proxy(vm, `_data`, key); // 将对 vm.data 数据的访问代理到 _data 上
    }
  }
  // observe data 将 data 转化为可响应
  observe(data, true /* asRootData */);
}

export function getData(data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget();
  try {
    return data.call(vm, vm);
  } catch (e) {
    handleError(e, vm, `data()`);
    return {};
  } finally {
    popTarget();
  }
}

const computedWatcherOptions = { lazy: true };

function initComputed(vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = (vm._computedWatchers = Object.create(null));
  // computed properties are just getters during SSR
  const isSSR = isServerRendering();

  for (const key in computed) {
    const userDef = computed[key];
    const getter = typeof userDef === 'function' ? userDef : userDef.get;
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(`Getter is missing for computed property "${key}".`, vm);
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      );
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(
          `The computed property "${key}" is already defined as a prop.`,
          vm
        );
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(
          `The computed property "${key}" is already defined as a method.`,
          vm
        );
      }
    }
  }
}

export function defineComputed(
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering();
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef);
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop;
    sharedPropertyDefinition.set = userDef.set || noop;
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    sharedPropertyDefinition.set === noop
  ) {
    sharedPropertyDefinition.set = function() {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      );
    };
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    }
  };
}

function createGetterInvoker(fn) {
  return function computedGetter() {
    return fn.call(this, this);
  };
}

/**
 * 初始化 methods
 * 首先进行验证，不能定义为非函数，不能与 prop 定义重复，不能定义已经在实例上并且以 _、$ 开头的名称
 * 然后直接将其添加到 vm 实例上
 */
function initMethods(vm: Component, methods: Object) {
  const props = vm.$options.props; // 提取出 props 配置
  for (const key in methods) {
    // 在开发环境下，对其进行检测
    if (process.env.NODE_ENV !== 'production') {
      // 如果定义的 methods 不是函数
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[
            key
          ]}" in the component definition. ` + // 在组件定义中
            `Did you reference the function correctly?`, // 你引用的函数正确吗
          vm
        );
      }
      // 如果已经在 props 中定义了的话
      if (props && hasOwn(props, key)) {
        warn(`Method "${key}" has already been defined as a prop.`, vm); // 方法 key 已经被定义为 prop
      }
      // methods 定义的 key 已经存在于实例上 并且是以 _(或 $) 开头
      if (key in vm && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
            `Avoid defining component methods that start with _ or $.`
        );
      }
    }
    // methods 直接添加到 vm 实例上
    vm[key] =
      typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
  }
}

function initWatch(vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key];
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, expOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options);
}

export function stateMixin(Vue) {
  // flow somehow has problems with directly declared definition object 流在某种程度上与直接声明的定义对象存在问题
  // when using Object.defineProperty, so we have to procedurally build up 当使用对象时。定义属性，所以我们必须按程序建立
  // the object here. 这里的物体
  const dataDef = {};
  dataDef.get = function() {
    return this._data;
  };
  const propsDef = {};
  propsDef.get = function() {
    return this._props;
  };
  // 如果不是在生产环境，那么修改 $data 和 $props 时会发出警告
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function() {
      warn(
        'Avoid replacing instance root $data. ' + // 避免替换实例根$data
          'Use nested data properties instead.', // 改用嵌套数据属性
        this
      );
    };
    propsDef.set = function() {
      warn(`$props is readonly.`, this); // $props是只读的
    };
  }
  // 为 Vue 原型添加 $data 属性，并且将其指向 _data，但是只设置了 getter 方法，也就是不能修改 $data
  // 但是无法阻止修改 $data 对象上的属性
  Object.defineProperty(Vue.prototype, '$data', dataDef);
  // 下面这个同理，添加 $props 属性
  Object.defineProperty(Vue.prototype, '$props', propsDef);

  // 添加 $set、$delete、$watch
  Vue.prototype.$set = set;
  Vue.prototype.$delete = del;

  Vue.prototype.$watch = function(
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this;
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options);
    }
    options = options || {};
    options.user = true;
    const watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`;
      pushTarget();
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info);
      popTarget();
    }
    return function unwatchFn() {
      watcher.teardown();
    };
  };
}
