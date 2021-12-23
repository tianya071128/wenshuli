/* @flow */

import { no, noop, identity } from 'shared/util';

import { LIFECYCLE_HOOKS } from 'shared/constants';

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function },
  silent: boolean,
  productionTip: boolean,
  performance: boolean,
  devtools: boolean,
  errorHandler: ?(err: Error, vm: Component, info: string) => void,
  warnHandler: ?(msg: string, vm: Component, trace: string) => void,
  ignoredElements: Array<string | RegExp>,
  keyCodes: { [key: string]: number | Array<number> },

  // platform
  isReservedTag: (x?: string) => boolean,
  isReservedAttr: (x?: string) => boolean,
  parsePlatformTagName: (x: string) => string,
  isUnknownElement: (x?: string) => boolean,
  getTagNamespace: (x?: string) => string | void,
  mustUseProp: (tag: string, type: ?string, name: string) => boolean,

  // private
  async: boolean,

  // legacy
  _lifecycleHooks: Array<string>,
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings. 是否不发出警告
   * 取消 Vue 所有的日志与警告。
   */
  silent: false,

  /**
   * Show production mode tip message on boot? 启动时显示生产模式提示消息
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools 是否启用 devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf 是否记录性能
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns 自定义 warn 处理函数
   * 为 Vue 的运行时警告赋予一个自定义处理函数。
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a 检查标记是否已保留，以使其无法注册为
   * component. This is platform-dependent and may be overwritten. 组成部分这取决于平台，可能会被覆盖
   * 这个配置没有暴露给开发者，而是在内部使用，会依据平台重写
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
  async: true,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS,
}: Config);
