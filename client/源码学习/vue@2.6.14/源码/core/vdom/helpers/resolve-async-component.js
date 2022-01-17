/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove,
} from 'core/util/index';

import { createEmptyVNode } from 'core/vdom/vnode';
import { currentRenderingInstance } from 'core/instance/render';

// 返回基于 comp 生成的子类构造器
function ensureCtor(comp: any, base) {
  // function () { return import('./my-async-component') } // 返回一个 Promise，相当于只存在成功时加载组件
  // 判断一下是否为模块内容 -- 如果是上述注册方式,那么就需要从 default 属性中提取组件配置项
  if (comp.__esModule || (hasSymbol && comp[Symbol.toStringTag] === 'Module')) {
    comp = comp.default;
  }
  // 如果组件配置项是对象，那么就建立一个构造器使用
  return isObject(comp) ? base.extend(comp) : comp;
}

export function createAsyncPlaceholder(
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode();
  node.asyncFactory = factory;
  node.asyncMeta = { data, context, children, tag };
  return node;
}

/**
 * 以下，首先需要知道异步组件的注册方法：
 * 1. function (resolve, reject) { resolve(成功时组件) } // 这里并没有使用 reject 传递一个失败组件(而是传入一个失败原因)，只关注了成功态
 * 2. function () { return import('./my-async-component') } // 返回一个 Promise，相当于只存在成功时加载组件
 * 3. function () { // 这种提供的选项更为丰富
 *      return {
 *        // 需要加载的组件 (应该是一个 `Promise` 对象)
 *        component: import('./MyComponent.vue'),
 *        // 异步组件加载时使用的组件
 *        loading: LoadingComponent,
 *        // 加载失败时使用的组件
 *        error: ErrorComponent,
 *        // 展示加载时组件的延时时间。默认值是 200 (毫秒)
 *        delay: 200,
 *        // 如果提供了超时时间且组件加载也超时了，
 *        // 则使用加载失败时使用的组件。默认值是：`Infinity`
 *        timeout: 3000
 *      }
 *    }
 * 所以我们大致有以下四种状态，并根据不同状态返回不同的构造器；
 *  1. 成功状态：返回根据成功态组件配置项生成的构造器
 *  2. 失败状态：如果配置了失败时展示组件，则返回根据失败态组件配置项生成的构造器
 *  3. 正在加载状态：如果配置了加载时展示组件，则返回根据加载态组件配置项生成的构造器
 *  4. 空状态(因为可能配置了展示加载时组件的延时时间)：此时返回一个 undefined
 *
 *
 * 加载这个异步组件需要展示组件组件构造器(通过 Vue.extend)-- 根据状态，可能展示 loading(加载中)、error(加载失败)、component(需要加载的组件)
 *  1. 异步组件加载失败：通过 factory.error 判断
 *     如果异步组件配置了 error 选项，那么就会在 factory.errorComp 引用这个失败组件的组件构造器
 *  2. 异步组件加载成功：通过 factory.resolved 判断
 *     异步组件一定需要配置需要加载的组件(component 配置项)，所以直接返回
 *  3. 异步组件正在加载：通过 factory.loading 判断
 *     如果注册了加载时组件，那么就会在 factory.loadingComp 中引用这个加载组件的组件构造器
 *  4. 初次加载：第一次加载时，就需要处理加载异步组件时的状态
 *      4.1 设置成功回调，当异步组件加载成功时，调用这个回调将其 factory.resolved 设置成功态组件构造器
 *      4.2 设置失败回调，当异步组件加载失败时，调用这个回调
 *      4.3 如果配置了加载时使用的组件
 *          4.3.1 如果设置了展示加载时组件的延时时间，那么就设置一个定时器，当延迟时间到了而异步组件还是没有结果的话
 *                我们就将 factory.loading 设置为 true
 *          4.3.2 如果没有设置延迟时间，那么就直接将 factory.loading 设置为 true
 *      4.4 如果配置了超时时间，设置定时器，当超时时间到了但组件还没有加载完毕，那么就直接调用 reject 回调并传入失败原因
 *   5. 最后如果是正在加载状态，返回正在加载展示组件生成的组件构造器
 *          或者返回 factory.resolved --> factory.resolved（如果已经加载成功态组件的话）- 此时可能会注册了一个同步组件 - 例如：function (resolve) { resolve(组件配置); // 直接调用 resolve }
 *
 *
 * 这个异步组件(注册是一个函数)可以进行复用的，所以我们将一些状态之类的添加到这个异步组件(注册是一个函数)中，以便我们在多次使用这个异步组件时
 * 可以通过缓存到异步组件(注册是一个函数)的属性来判断当前异步组件的状态：
 *  1. factory.error：异步组件是否加载失败状态
 *  2. factory.errorComp：加载失败展示组件生成的组件构造器
 *  3. factory.resolved：异步组件加载成功 - 并且存储着成功展示组件生成的组件构造器
 *  4. factory.loading：异步组件是否为加载状态
 *  5. factory.loadingComp：正在加载展示组件生成的组件构造器
 */
export function resolveAsyncComponent(
  factory: Function, // 异步组件工厂函数 -- 即异步组件注册函数
  baseCtor: Class<Component> // Vue 构造器
): Class<Component> | void {
  // 异步组件加载失败态
  if (
    isTrue(factory.error) && // 这个异步组件已经加载失败
    isDef(factory.errorComp) // errorComp：根据异步组件注册 error(失败展示的组件) 生成的组件构造器
  ) {
    // 如果这个异步组件已经加载失败的，那么返回基于 失败展示的组件 构建的组件构造器
    return factory.errorComp;
  }

  // 异步组件加载成功态，返回这个异步组件成功态的组件构造器
  if (isDef(factory.resolved)) {
    return factory.resolved;
  }

  const owner = currentRenderingInstance; // 当前渲染组件实例 - 也表示这个异步组件的父组件实例
  // factory.owners：存储着使用这个异步组件的父组件集合，我们收集这些，以便在异步组件加载完成(成功或失败)时，重新渲染这些组件实例集合，从而实现根据异步组件状态返回不同的组件构造器，渲染不同的组件
  // 因为我们上面判断了成功和失败态，如果走到这里的话，说明这个异步组件还没有加载成功，才需要收集这个集合
  if (
    owner && // 当前渲染组件实例存在的话
    isDef(factory.owners) && // 存在这个集合的话 - 下面会初始化一次
    factory.owners.indexOf(owner) === -1 // 如果当前渲染组件实例不存在 owner 集合中 - 同一组件实例只需要添加一次
  ) {
    // already pending 已经开始等待
    // 推入集合中
    factory.owners.push(owner);
  }

  // 这里是异步组件正在加载过程返回的构造器
  if (
    isTrue(factory.loading) && // 组件状态为正在加载中
    isDef(factory.loadingComp) // 正在加载组件生成的组件构造器
  ) {
    return factory.loadingComp;
  }

  // 这里是这个异步组件初次加载，我们需要调用异步组件配置的函数，因为还需要考虑到
  if (
    owner && // 正在渲染组件 - 为什么这里还需要做一层限制？
    !isDef(factory.owners) // 根据 factory.owners 标识就可以判断是否为初次加载
  ) {
    const owners = (factory.owners = [owner]); // 初始化 factory.owners 集合，并将当前渲染组件(使用异步组件的父组件)作为第一项
    let sync = true;
    let timerLoading = null;
    let timerTimeout = null;

    // 在这里侦听 destroyed 生命周期，如果父组件都销毁了，就没有必要在销毁异步组件(作为父组件使用的组件)
    (owner: any).$on('hook:destroyed', () => remove(owners, owner));

    // 异步组件加载状态变更时(可能是加载成功或失败或者正在加载[此时因为设置了展示加载时组件的延时时间])后执行回调
    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        // 让使用这个异步组件的组件实例重新渲染，这样的话，异步组件就会渲染不一样的组件实例
        (owners[i]: any).$forceUpdate();
      }

      // 是否已经加载结束(加载成功或失败)
      if (renderCompleted) {
        owners.length = 0; // 删除集合
        // 清除定时器
        if (timerLoading !== null) {
          clearTimeout(timerLoading);
          timerLoading = null;
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout);
          timerTimeout = null;
        }
      }
    };

    // 加载异步组件成功时的回调
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved 缓存解析
      factory.resolved = ensureCtor(res, baseCtor); // 缓存下成功态组件配置生成的组件构造器
      // invoke callbacks only if this is not a synchronous resolve 仅当这不是同步解析时调用回调
      // (async resolves are shimmed as synchronous during SSR)（在SSR期间，异步解析被填充为同步）
      if (!sync) {
        forceRender(true);
      } else {
        owners.length = 0; // SSR 期间，异步组件会被当成同步组件渲染
      }
    });

    // 加载异步组件失败时的回调
    const reject = once((reason) => {
      // 加载失败时错误警告
      process.env.NODE_ENV !== 'production' &&
        warn(
          `Failed to resolve async component: ${String(factory)}` + // 无法解析异步组件
            (reason ? `\nReason: ${reason}` : '') // 原因
        );
      // 如果注册了失败态组件
      if (isDef(factory.errorComp)) {
        factory.error = true; // 将其 factory.error 状态置为 true
        forceRender(true); // 并通知使用这个异步组件更新渲染
      }
    });

    // 我们先调用 factory 函数，传入 resolve, reject 看下是否为 function (resolve, reject) { resolve(成功时组件); reject(失败时组件) } 这种注册方式
    const res = factory(resolve, reject);

    if (isObject(res) /** 如果调用返回了值的话 */) {
      if (
        isPromise(res) // 返回值为 Promise，即为返回一个 Promise 方式注册 -- function () { return import('./my-async-component') }
      ) {
        // () => Promise
        // 如果不是成功态
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject); // 调用这个 Promise，使用 resolve 和 reject 作为成功和失败回调
        }
      } else if (
        isPromise(res.component) // 返回是一个对象形式配置
      ) {
        // 在这里，关注一下需要加载组件的失败成功态
        res.component.then(resolve, reject);

        // 如果配置了加载失败时使用的组件，那么就生成失败态组件的组件构造器
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor);
        }

        // 如果配置了异步组件加载时使用的组件
        if (isDef(res.loading)) {
          // 先生成加载态组件的组件构造器
          factory.loadingComp = ensureCtor(res.loading, baseCtor);
          // res.delay：展示加载时组件的延时时间。默认值是 200 (毫秒)
          if (res.delay === 0 /** 不需要延迟 */) {
            factory.loading = true; // 直接将状态设置为 true
          } /** 延迟展示加载时组件 */ else {
            timerLoading = setTimeout(() => {
              timerLoading = null;
              // 如果延迟结束，还是加载状态的话，那么就通知使用这个异步组件的父组件重新渲染，以便渲染这个加载状态时的组件
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true; // 正在加载状态
                forceRender(false);
              }
            }, res.delay || 200);
          }
        }

        // 如果配置了超时时间的话
        if (isDef(res.timeout)) {
          // 设置定时器
          timerTimeout = setTimeout(() => {
            timerTimeout = null;
            // 如果还不是成功态，则使用加载失败时使用的组件
            if (isUndef(factory.resolved)) {
              // 调用 reject 回调，在回调中，会尝试使用失败态组件
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              );
            }
          }, res.timeout);
        }
      }
    }

    sync = false;
    // return in case resolved synchronously 在同步解决的情况下返回
    return factory.loading // 如果是加载状态，此时可能是展示加载时组件的延时时间为 0，即不延迟
      ? factory.loadingComp // 返回加载状态组件
      : factory.resolved; // 否则返回 factory.resolved（如果已经加载成功态组件的话）- 此时可能会注册了一个同步组件 - 例如：function (resolve) { resolve(组件配置); // 直接调用 resolve }
  }
}
