/* @flow */

import { ASSET_TYPES } from 'shared/constants';
import { defineComputed, proxy } from '../instance/state';
import { extend, mergeOptions, validateComponentName } from '../util/index';

// 添加 extend 静态方法 -- 使用基础 Vue 构造器，创建一个“子类”。
export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0;
  let cid = 1;

  /**
   * Class inheritance 类继承
   *  这里构造了一个构造函数的类继承关系，使用基础 Vue 构造器，创建一个“子类”。
   *  主要有两个主要的功能：
   *  1. 缓存：在这里，我们针对同一 options，统一子类调用的 extend 进行缓存，就不需要重复合并选项。
   *  2. 合并选项，初始话一些工作：在这里，我们已经将超类的 optinos 和当前 options 合并起来，并且做了一些可以提前做的工作(例如 props 属性访问代理、computed 初始化工作)
   */
  Vue.extend = function(extendOptions: Object /** 组件配置对象 */): Function {
    extendOptions = extendOptions || {};
    const Super = this; // 超类构造函数
    const SuperId = Super.cid; // 超类构造函数 id

    // 如果已经对 extendOptions 构造过的话，就会缓存在 extendOptions._Ctor 中，就不需要重复进行配置项合并等操作
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    /**
     * 这个缓存还需要根据 当前构造函数 来区分 -- 因为这个 extendOptions 可能是被多个子类的 extend 来创建
     * 例如：
     *  1. Vue.extend(extendOptions)，此时这个 Super.cid 就表示 Vue 构造函数
     *  2. const Profile = Vue.extend(options); Profile.extend(extendOptions)，此时这个 Super.cid 表示的是 Profile 构造函数
     */
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]; // 返回缓存
    }

    const name = extendOptions.name || Super.options.name; // 找到 name 配置项
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name); // 检测组件名称是否合法
    }

    // “子类”的构造器
    const Sub = function VueComponent(options) {
      this._init(options);
    };
    // 子类继承超类的原型
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    // 子类的 id
    Sub.cid = cid++;
    // 将子类和超类的 options 合并
    Sub.options = mergeOptions(Super.options, extendOptions);
    // 建立子类和超类的关系
    Sub['super'] = Super;

    // For props and computed properties, we define the proxy getters on 对于props和computed属性，我们在
    // the Vue instances at extension time, on the extended prototype. This 在扩展原型上扩展时的Vue实例。这
    // avoids Object.defineProperty calls for each instance created. 避开物体。为创建的每个实例调用defineProperty。
    // 在创建子类构造器过程中就初始化 props 和 computed
    // props 只是简单的将 props 属性访问代理到 Sub.prototype 的 _props 上
    if (Sub.options.props) {
      initProps(Sub);
    }
    // 但是对于 computed 而言，还初始化了计算属性其他工作，但是因为计算属性是惰性的，所以对于统一构造函数来讲，组件的计算属性初始化工作是可以在这里实现的
    if (Sub.options.computed) {
      initComputed(Sub);
    }

    // allow further extension/mixin/plugin usage 允许进一步 extension/mixin/plugin 使用
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes 创建资产寄存器，以便扩展类
    // can have their private assets too. 也可以拥有他们的私人资产。
    // 从超类中继承资产
    ASSET_TYPES.forEach(function(type) {
      Sub[type] = Super[type];
    });
    // enable recursive self-lookup 启用递归自查找
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time. 在扩展时保留对超级选项的引用。
    // later at instantiation we can check if Super's options have 稍后在实例化时，我们可以检查Super的选项是否有
    // been updated. 已更新
    Sub.superOptions = Super.options;
    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = extend({}, Sub.options);

    // cache constructor 缓存构造器
    cachedCtors[SuperId] = Sub;
    return Sub; // 返回创建的构造器
  };
}

// 初始化 props 的属性访问，在这里代理到 _props，这样在初始化时就可以省去这一步骤
// 对于统一配置项的子组件来讲，可以省去重复的代理工作
function initProps(Comp) {
  // 获取 props 选项
  const props = Comp.options.props;
  // 将 props 的获取代理到 _props 属性上
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key);
  }
}

// 与 props 同理，初始化 computed
function initComputed(Comp) {
  const computed = Comp.options.computed;
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key]);
  }
}
