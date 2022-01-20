/* @flow */

import { isRegExp, remove } from 'shared/util';
import { getFirstComponentChild } from 'core/vdom/helpers/index';

type CacheEntry = {
  name: ?string,
  tag: ?string,
  componentInstance: Component,
};

type CacheEntryMap = { [key: string]: ?CacheEntry };

// 获取组件名称 -- 首先检查组件自身的 name 选项，如果 name 选项不可用，则匹配它的局部注册名称 (父组件 components 选项的键值)。
function getComponentName(opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag);
}

// 根据模式的类型，来判断该 name 是否匹配
function matches(
  pattern: string | RegExp | Array<string>, // 匹配模式
  name: string // 组件名称
): boolean {
  if (Array.isArray(pattern) /** 如果是数组的话 */) {
    return pattern.indexOf(name) > -1; // 检测 name 是否在数组中
  } else if (typeof pattern === 'string' /** 如果是字符串的话 */) {
    return pattern.split(',').indexOf(name) > -1; // 将字符串以 , 分隔，检测是否在范围内
  } else if (isRegExp(pattern) /** 如果是正则 */) {
    return pattern.test(name); // 以正则验证
  }
  /* istanbul ignore next */
  return false;
}

// 删除缓存 - 根据 filter 筛选出需要被清除的缓存
function pruneCache(keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance; // 提取出 keep-alive 的缓存对象，keys，_vnode
  // 遍历缓存对象
  for (const key in cache) {
    const entry: ?CacheEntry = cache[key];
    if (entry) {
      const name: ?string = entry.name;
      // 如果该缓存组件不能被缓存的话，就清除这个缓存项
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode);
      }
    }
  }
}

// 删除缓存组件 - 如果需要删除的组件不是当前渲染的组件，那么就执行 $destroy 钩子，然后从缓存对象中清除该组件
function pruneCacheEntry(
  cache: CacheEntryMap, // 缓存对象
  key: string, // 缓存的 key
  keys: Array<string>, // 缓存组件 key 的集合
  current?: VNode // 当前 keep-alive 渲染 vnode
) {
  const entry: ?CacheEntry = cache[key];
  // 如果该缓存组件不是当前渲染组件的话，就执行组件的 $destroy 方法执行组件销毁工作
  // 那么如果需要删除的组件正好是当前渲染的组件的话，就不要去进行销毁了
  if (entry && (!current || entry.tag !== current.tag)) {
    entry.componentInstance.$destroy();
  }
  // 将该缓存组件置为 null，即执行了清除工作，后续就不会对这个组件进行缓存
  cache[key] = null;
  remove(keys, key);
}

const patternTypes: Array<Function> = [String, RegExp, Array];

/**
 * 实现缓存的机制：
 *  1. 每次渲染 keep-alive 时，都会调用 render 函数，此时可以默认插槽中提取出需要缓存组件类型 Vnode
 *  2. keep-alive 组件会维护一个缓存对象(hasMap: { [key: string]: Vndoe })
 *      - 根据组件 name 判断是否允许被缓存(根据 include、exclude)
 *      - 根据组件 key(componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')) 判断是否已经被缓存
 *  3. 如果这个 Vnode 被缓存，从缓存对象中提取该 Vnode 对应的实例 ===> cache[key].componentInstance
 *      - 只需要保持组件实例是缓存之前的，其他数据对象模块(class、style、events等)都会被单独处理
 */
export default {
  name: 'keep-alive',
  abstract: true, // 抽象组件 - 它自身不会渲染一个 DOM 元素，也不会出现在组件的父组件链中。

  // 接收三个 prop
  props: {
    include: patternTypes, // 字符串或正则表达式。只有名称匹配的组件会被缓存。
    exclude: patternTypes, // 字符串或正则表达式。任何名称匹配的组件都不会被缓存。
    max: [String, Number], // 数字。最多可以缓存多少组件实例。
  },

  methods: {
    // 组件 Vnode 实例化后进行缓存
    cacheVNode() {
      const { cache, keys, vnodeToCache, keyToCache } = this;
      // 此时这个 vnode 表示需要被缓存但是还没有添加到缓存对象中的
      if (vnodeToCache) {
        const { tag, componentInstance, componentOptions } = vnodeToCache;
        // 进行缓存
        cache[keyToCache] = {
          name: getComponentName(componentOptions),
          tag,
          componentInstance,
        };
        keys.push(keyToCache);
        // prune oldest entry 删除最旧的条目
        // 如果删除最大缓存数量，那么就清除最旧的(数组队头)
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode);
        }
        this.vnodeToCache = null; // 清除缓存 Vnode 标识
      }
    },
  },

  created() {
    this.cache = Object.create(null); // 缓存的组件集合
    this.keys = [];
  },

  // keep-alive 组件销毁，此时所有的被这个 keep-alive 缓存的组件都需要被销毁
  destroyed() {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys);
    }
  },

  mounted() {
    // 等组件 Vnode 实例化完毕后在进行缓存最新的
    this.cacheVNode();
    // 当 include 匹配模式变化的话，及时清除不被 include 匹配的组件
    this.$watch('include', (val) => {
      pruneCache(this, (name) => matches(val, name));
    });
    // 同理，当 exclude 匹配模式变化的话，及时清除被排除的组件
    this.$watch('exclude', (val) => {
      pruneCache(this, (name) => !matches(val, name));
    });
  },

  updated() {
    this.cacheVNode(); // 重渲染情况 - 等组件 Vnode 实例化完毕后在进行缓存最新的
  },

  /**
   * 返回 keep-alive 实际渲染的 Vnode：
   *
   *   1. 从默认插槽数组中提取出第一个组件类型 Vnode ===> 也就是我们只会根据默认插槽的第一个组件类型 Vnode 进行缓存(是用在其一个直属的子组件被开关的情形)
   *   2. 从这个 Vnode 中提取出 name ===> 首先检查组件自身的 name 选项，如果 name 选项不可用，则匹配它的局部注册名称 (父组件 components 选项的键值)。
   *   3. 通过检测 Vnode 的 name 如果不被 include 匹配或被 exclude 排除的话，就不缓存这个组件了，直接返回这个 Vnode
   *   4. 如果已经被缓存的话，从缓存中提取 cache[key].componentInstance 缓存的组件实例放在 Vnode.componentInstance 中 ===> 因为组件状态都是存放在 componentInstance 实例上的
   *   5. 如果没有被缓存的话，延迟进行缓存 ===> 此时 Vnode 是最新的，还没有进行实例化，延迟到 mounted 钩子中进行缓存
   *   6. 标识一下这个一个缓存的 vnode：vnode.data.keepAlive = true;
   *   7. 将处理好的 vnode 返回，后续就会对这个 vndoe 进行渲染
   */
  render() {
    const slot = this.$slots.default; // 取出默认插槽，即 keep-alive 的子节点
    /**
     * 从默认插槽 Vnode 数组中获取到第一个组件类型 Vnode，其他的插槽都会被抛弃
     */
    const vnode: VNode = getFirstComponentChild(slot);
    const componentOptions: ?VNodeComponentOptions =
      vnode && vnode.componentOptions; // 提取出组件类型 Vnode 的参数(props、listeners、Ctor等)

    // 如果 keep-alive 的插槽内容存在组件类型的 Vnode 的话，才进行处理
    // 也就是 keep-alive 只会缓存组件，而不会缓存元素。
    if (componentOptions) {
      // check pattern 检查模式
      const name: ?string = getComponentName(componentOptions); // 获取组件名称 -- 首先检查组件自身的 name 选项，如果 name 选项不可用，则匹配它的局部注册名称 (父组件 components 选项的键值)。
      const { include, exclude } = this;
      if (
        // not included 不包括
        (include && (!name || !matches(include, name))) || // 检测 include(字符串或正则表达式。只有名称匹配的组件会被缓存。)
        // excluded 排除
        (exclude && name && matches(exclude, name)) // 检测 exclude(字符串或正则表达式。任何名称匹配的组件都不会被缓存。)
      ) {
        // 如果不被 include 匹配或被 exclude 排除的话，就不缓存这个组件了
        return vnode;
      }

      const { cache, keys } = this;
      // 如果这个 vnode 不存在 key 标识的话，就打上一个 key 标识
      // 如果存在 key 标识的话，就提取出 key
      // 因为统一构造函数可以注册为不同的本地组件，例如：components: { myComponent1:myComponent, myComponent2:myComponent }
      // 这里我们需要将 myComponent1 和 myComponent2 看成是不同的组件进行缓存
      const key: ?string =
        vnode.key == null
          ? // same constructor may get registered as different local components 同一个构造函数可以注册为不同的本地组件
            // so cid alone is not enough (#3269) 所以光靠cid是不够的（3269）
            componentOptions.Ctor.cid +
            (componentOptions.tag ? `::${componentOptions.tag}` : '')
          : vnode.key;
      // 检测该组件 Vndoe 是否被缓存
      if (cache[key]) {
        // 如果被缓存了的话，那么就提取出缓存的实例 - 实例中才保持着组件缓存前的状态
        vnode.componentInstance = cache[key].componentInstance;
        // make current key freshest 使当前密钥最新
        // 先将该 Vnode.key 从keys 删除，在推入至队尾 -- 这样保持该组件 Vnode 为最新的，这样超出最大缓存数(max)时不会被优先销毁
        remove(keys, key);
        keys.push(key);
      } else {
        // delay setting the cache until update 延迟设置缓存，直到更新
        // 这里 Vnode 是最新的，还没有进行实例化，延迟到 mounted 钩子中进行缓存
        this.vnodeToCache = vnode; // 保留一下需要缓存的 vnode
        this.keyToCache = key; //
      }

      // 标识一下这是一个缓存组件 - 后续 Vnode 的初始化和更新都会特殊处理
      vnode.data.keepAlive = true;
    }
    // 将该 Vnode 返回，后续就会对这个 Vnode 进行操作
    return vnode || (slot && slot[0]);
  },
};
