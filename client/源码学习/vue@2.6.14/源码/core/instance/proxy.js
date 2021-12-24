/* not type checking this file because flow doesn't play well with Proxy */
//
import config from 'core/config';
import { warn, makeMap, isNative } from '../util/index';

let initProxy;

if (
  process.env.NODE_ENV !==
  'production' /** 只在开发环境下产生 Proxy 代理新增语法 */
) {
  // 检测是否为全局对象
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
      'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
      'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
      'require' // for Webpack/Browserify
  );

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` + // 实例上未定义属性或方法“${key}”，但
      'referenced during render. Make sure that this property is reactive, ' + // 在渲染期间引用。确保此属性是反应性的
      'either in the data option, or for class-based components, by ' + // 在数据选项中，或对于基于类的组件，通过
      'initializing the property. ' + // 初始化属性
        'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.', // 见：
      target
    );
  };

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` + // 必须使用“$data.${key}”访问属性“${key}”，因为
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' + // 在Vue实例中，以“$”或“25;”开头的属性未代理为
      'prevent conflicts with Vue internals. ' + // 防止与Vue内部发生冲突。
        'See: https://vuejs.org/v2/api/#data', // 见：https://vuejs.org/v2/api/#data
      target
    );
  };

  const hasProxy = typeof Proxy !== 'undefined' && isNative(Proxy); // 检测当前环境是否支持 proxy

  // 如果支持 proxy 的话，那么代理下 config.keyCodes(给 v-on 自定义键位别名。) 值，检测设置值
  if (hasProxy) {
    // 不允许设置的 keyCodes 列表
    const isBuiltInModifier = makeMap(
      'stop,prevent,self,ctrl,shift,alt,meta,exact'
    );
    config.keyCodes = new Proxy(config.keyCodes, {
      set(target, key, value) {
        // 检测设置 key 是否为不合法值
        if (isBuiltInModifier(key)) {
          warn(
            `Avoid overwriting built-in modifier in config.keyCodes: .${key}` // 避免覆盖配置中的内置修饰符。键码
          );
          return false;
        } else {
          target[key] = value;
          return true;
        }
      },
    });
  }

  // 拦截propKey in proxy的操作，返回一个布尔值。
  const hasHandler = {
    has(target, key) {
      const has = key in target; // 判断 key 是否存在 target 上
      const isAllowed =
        allowedGlobals(key) || // 是否为全局对象
        (typeof key === 'string' &&
          key.charAt(0) === '_' &&
          !(key in target.$data)); // 或者是以 _ 开头的 key
      if (!has && !isAllowed) {
        // 如果存在 $data 中，就报错警告
        if (key in target.$data) warnReservedPrefix(target, key);
        else warnNonPresent(target, key);
      }
      return has || !isAllowed;
    },
  };

  const getHandler = {
    get(target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key);
        else warnNonPresent(target, key);
      }
      return target[key];
    },
  };

  // 初始化渲染时的上下文 -- 用来检测 template 模板中使用的变量是否存在
  initProxy = function initProxy(vm) {
    if (hasProxy) {
      // determine which proxy handler to use // 确定要使用的代理处理程序
      const options = vm.$options;
      const handlers =
        // options.render：字符串模板的代替方案，允许你发挥 JavaScript 最大的编程能力。渲染函数
        // 当使用类似 webpack 这样的打包工具时，我们将使用 vue-loader 进行模板编译，这个时候 options.render 是存在的，并且 _withStripped 的属性也会设置为true
        options.render && options.render._withStripped
          ? getHandler // 如果使用了 render 选项，那么就会是 get 操作
          : hasHandler; // 否则就是判断操作
      vm._renderProxy = new Proxy(vm, handlers);
    } else {
      vm._renderProxy = vm;
    }
  };
}

export { initProxy };
