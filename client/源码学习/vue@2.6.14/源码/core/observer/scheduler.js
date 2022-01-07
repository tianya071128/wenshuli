/* @flow */
// 这个文件是用来执行 Watcher 队列的
import type Watcher from './watcher';
import config from '../config';
import { callHook, activateChildComponent } from '../instance/lifecycle';

import { warn, nextTick, devtools, inBrowser, isIE } from '../util/index';

export const MAX_UPDATE_COUNT = 100;

// 这个 queue　与 nextTick 中维护的队列不同，
// queue 队列是维护着 Watcher 的，统一管理 Watcher。并且方便在执行过程中随时添加 Watcher
// nextTick 中队列维护着调用 nextTick 时添加的回调。
// 但是 queue 启动执行却是通过 nextTick 方法
const queue: Array<Watcher> = []; // Watcher 执行队列
const activatedChildren: Array<Component> = []; // 与 keep-alive 缓存组件相关
let has: { [key: number]: ?true } = {}; // 存储着一个任务队列中更新的 Wathcer 队列，是一个 { key: Boolean} 类型
let circular: { [key: number]: number } = {}; // 用于记录一个更新阶段统一 Watcher 执行次数，防止循环更新
let waiting = false; // queue 是否开始启动标识
let flushing = false; // Wathcer 是否执行标识
let index = 0; // 当前执行 Watcher 的索引

/**
 * Reset the scheduler's state. 重置计划程序的状态
 * 在一个更新周期中已经执行完毕后，清理相关标识
 */
function resetSchedulerState() {
  index = queue.length = activatedChildren.length = 0; // 清空队列
  has = {};
  if (process.env.NODE_ENV !== 'production') {
    circular = {};
  }
  waiting = flushing = false;
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0;

// Async edge case fix requires storing an event listener's attach timestamp. 异步边缘案例修复需要存储事件侦听器的附加时间戳
let getNow: () => number = Date.now; // 获取时间戳

// Determine what event timestamp the browser is using. Annoyingly, the 确定浏览器正在使用的事件时间戳。令人恼火的是
// timestamp can either be hi-res (relative to page load) or low-res 时间戳可以是高分辨率（相对于页面加载）或低分辨率
// (relative to UNIX epoch), so in order to compare time we have to use the （相对于UNIX时代），因此为了比较时间，我们必须使用
// same timestamp type when saving the flush timestamp. 保存刷新时间戳时使用相同的时间戳类型。
// All IE versions use low-res event timestamps, and have problematic clock 所有IE版本都使用低分辨率事件时间戳，并且有问题的时钟
// implementations (#9632) 实施（#9632）
if (inBrowser /** 浏览器环境 */ && !isIE /** 不是 IE */) {
  const performance = window.performance; // 是否支持 performance API -- 获取到当前页面中与性能相关的信息。
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is 如果是事件时间戳，尽管在日期之后计算。Date.now() 是
    // smaller than it, it means the event is using a hi-res timestamp, 于它表示事件正在使用高分辨率时间戳
    // and we need to use the hi-res version for event listener timestamps as 我们需要使用hi-res版本作为事件侦听器时间戳
    // well. 嗯
    getNow = () => performance.now(); // 返回一个表示从性能测量时刻开始经过的毫秒数
  }
}

/**
 * Flush both queues and run the watchers. 刷新两个队列并运行观察程序
 * 刷新队列的策略：
 *  1. 先对队列中 Watcher 进行排序，排序原因内部注释有说明
 *  2. 遍历 queue 通知 Watcher 进行更新，并对循环更新进行控制次数
 *  3. 队列执行完毕重置标识
 *  4. 执行组件 activated 和 updated 生命周期
 */
function flushSchedulerQueue() {
  currentFlushTimestamp = getNow(); // 获取到执行队列开始时间
  flushing = true; // 执行队列标识
  let watcher, id;

  // Sort queue before flush. 刷新前对队列进行排序。
  // This ensures that: 这可确保：
  // 1. Components are updated from parent to child. (because parent is always  1. 组件从父级更新到子级。（因为父母总是
  //    created before the child) 在子对象之前创建）
  // 2. A component's user watchers are run before its render watcher (because 2. 组件的用户观察程序在其渲染观察程序之前运行（因为
  //    user watchers are created before the render watcher) 用户观察程序在渲染观察程序之前创建）
  // 3. If a component is destroyed during a parent component's watcher run, 3. 如果某个组件在父组件的观察程序运行期间被销毁，
  //    its watchers can be skipped.它的观察者可以跳过。
  // 综上原因，需要对 Watcher 进行排序
  queue.sort((a, b) => a.id - b.id);

  // do not cache length because more watchers might be pushed 不要缓存长度，因为可能会推送更多的观察者
  // as we run existing watchers 当我们运行现有的监视程序时
  // 遍历执行
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]; // 取出当前需要执行的 Watcher
    // 如果存在 before 钩子(开始更新前的钩子)
    if (watcher.before) {
      watcher.before(); // 执行钩子
    }
    // 先将该 Watcher id 置为 null
    id = watcher.id;
    has[id] = null;
    // 执行，控制权就会转交给 Watcher
    watcher.run();
    // in dev build, check and stop circular updates. 在开发人员构建中，检查并停止循环更新
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1; // 刚这个 Watcher 已经更新好了，但是又被推入到了 queue 队列中了的话，那我们就为其计数
      // 如果同一个 Watcher 执行次数大于 100 次
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + // 您可能有一个无限的更新循环
            (watcher.user
              ? `in watcher with expression "${watcher.expression}"` // 有表情的旁观者
              : `in a component render function.`), // 在组件渲染函数中
          watcher.vm
        );
        break;
      }
    }
  }

  // keep copies of post queues before resetting state 在重置状态之前保留post队列的副本
  const activatedQueue = activatedChildren.slice(); // 与 keep-alive 缓存有关
  const updatedQueue = queue.slice(); // 保存队列副本

  // 队列执行完毕后重置标识
  resetSchedulerState();

  // call component updated and activated hooks 调用组件更新并激活挂钩
  callActivatedHooks(activatedQueue); // 执行组件 activated 生命周期
  callUpdatedHooks(updatedQueue); // 执行组件 updated 生命周期

  // devtool hook
  /* istanbul ignore if */
  // 通知 devtool 钩子
  if (devtools && config.devtools) {
    devtools.emit('flush');
  }
}

// 调用组件 updated 生命周期
function callUpdatedHooks(queue) {
  let i = queue.length;
  // 遍历 - 从队列尾部开始遍历，这样的话就会在子组件先执行 updated 钩子再执行父组件的
  while (i--) {
    const watcher = queue[i];
    const vm = watcher.vm;
    if (
      vm._watcher === watcher && // 这个 Watcher 是组件渲染函数
      vm._isMounted && // 并且这个组件不是初始渲染
      !vm._isDestroyed // 这个组件没有渲染
    ) {
      callHook(vm, 'updated'); // 执行 updated 钩子
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch. 将修补程序期间激活的保持活动状态的组件排队
 * The queue will be processed after the entire tree has been patched. 将在修补整个树后处理队列
 */
export function queueActivatedComponent(vm: Component) {
  // setting _inactive to false here so that a render function can 此处将 _inactive 设置为false，以便渲染函数可以
  // rely on checking whether it's in an inactive tree (e.g. router-view) 依靠检查它是否在非活动树中（例如路由器视图）
  vm._inactive = false;
  activatedChildren.push(vm);
}

// 调用组件 activated 生命周期相关
function callActivatedHooks(queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true;
    activateChildComponent(queue[i], true /* true */);
  }
}

/**
 * Push a watcher into the watcher queue. 将观察者推入观察者队列
 * Jobs with duplicate IDs will be skipped unless it's 具有重复ID的作业将被跳过，除非
 * pushed when the queue is being flushed. 在刷新队列时推送
 * 推入 Watcher 策略：
 *  1. 根据 Watcher.id 来去除重复的 Watcher
 *  2. 推入队列中：
 *      2.1 没有开始执行的话，直接推入队列中
 *      2.2 已经开始执行的话，根据 Watcher.id 推入到队列适当的位置
 *  3. 通过 nextTick 异步启动这个 Watcher 队列
 */
export function queueWatcher(watcher: Watcher) {
  const id = watcher.id; // 获取需要推入 Wathcer id
  // 如果在队列中存在了该 Watcher，则直接跳过
  if (has[id] == null) {
    has[id] = true; // 添加进 has 集合
    // 如果 Wathcer 队列没有开始执行的话
    if (!flushing) {
      queue.push(watcher); // 那么就推入 queue 队列中
    } else {
      // if already flushing, splice the watcher based on its id 如果已经刷新，则根据其id拼接观察程序
      // if already past its id, it will be run next immediately. 如果已超过其id，则将立即运行它
      // 在以开始执行(刷新)时，通过 Watcher 的 id 来判断执行时机
      let i = queue.length - 1;
      while (i > index && queue[i].id > watcher.id) {
        i--;
      }
      // 根据 id 大小推入到相应位置
      queue.splice(i + 1, 0, watcher);
    }
    // queue the flush queue 开始刷新
    // 如果没有开始启动队列的话，就通过 nextTick 启动其队列，接下来启动时机就由 nextTick 决定
    if (!waiting) {
      waiting = true;

      // 如果是同步执行的话，直接开始执行队列
      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue();
        return;
      }
      // 否则通过 nextTick 异步更新
      nextTick(flushSchedulerQueue);
    }
  }
}
