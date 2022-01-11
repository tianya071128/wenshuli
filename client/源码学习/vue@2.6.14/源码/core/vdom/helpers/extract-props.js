/* @flow */

import {
  tip,
  hasOwn,
  isDef,
  isUndef,
  hyphenate,
  formatComponentName,
} from 'core/util/index';

// 根据 data(数据对象) 和 构造函数 提取出 res(即 propsData)，后续供给初始化 props 的值使用
// 遍历组件配置 props 项，从 data(数据对象) 的 props 尝试提取，后尝试从 attrs 中提取
export function extractPropsFromVNodeData(
  data: VNodeData, // 数据对象
  Ctor: Class<Component>, // 组件的构造函数
  tag?: string
): ?Object {
  // we are only extracting raw values here. 我们这里只提取原始值。
  // validation and default values are handled in the child 验证和默认值在子系统中处理
  // component itself. 组件本身。
  const propOptions = Ctor.options.props; // 组件定义的 props
  // 如果组件没有定义 props 的话，直接返回
  if (isUndef(propOptions)) {
    return;
  }
  const res = {};
  const { attrs, props } = data;
  // data 数据对象中定义了 attrs(普通的 HTML attribute) 和 props(组件 prop)
  if (isDef(attrs) || isDef(props)) {
    // 遍历组件 props 配置
    for (const key in propOptions) {
      // 将 key 驼峰命名转化为以 - 分隔的字符串
      const altKey = hyphenate(key);
      // 开发环境下检测 key 是否存在异常
      if (process.env.NODE_ENV !== 'production') {
        const keyInLowerCase = key.toLowerCase(); // 字母小写化
        if (key !== keyInLowerCase && attrs && hasOwn(attrs, keyInLowerCase)) {
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` + // Prop "${keyInLowerCase}" 传递给组件
            `${formatComponentName(
              // 提取组件名信息
              tag || Ctor
            )}, but the declared prop name is` + // 但是声明的道具名称是
            ` "${key}". ` + // "${key}"
            `Note that HTML attributes are case-insensitive and camelCased ` + // 请注意，HTML属性不区分大小写，大小写为'
            `props need to use their kebab-case equivalents when using in-DOM ` + // 道具在DOM中使用时需要使用它们的烤串大小写等价物
              `templates. You should probably use "${altKey}" instead of "${key}".` // 模板。您可能应该使用“${altKey}”而不是“${key}
          );
        }
      }
      // 首先尝试从 props 中提取，后尝试从 attrs 中提取
      checkProp(res, props, key, altKey, true) ||
        checkProp(res, attrs, key, altKey, false);
    }
  }
  return res;
}

// 验证 hash 目标对象中是否存在 key 属性 -- 并且提取出对应的属性值赋值到 res 中
function checkProp(
  res: Object, // propsData --
  hash: ?Object, // 目标对象 -- 首先尝试从数据对象的 props ，然后尝试从 attrs 提取
  key: string, // 需要提取的 key
  altKey: string, // 驼峰命名的 key
  preserve: boolean // 如果从目标对象中找到的话，是否进行删除 key 属性操作
): boolean {
  if (isDef(hash)) {
    // 如果 key 存在 hash 目标对象中
    if (hasOwn(hash, key)) {
      res[key] = hash[key]; // 从目标对象中提取赋值到 res 上，这样就会改变入参的 res
      if (!preserve) {
        delete hash[key]; // 从目标对象上删除该 key
      }
      return true;
    } else if (hasOwn(hash, altKey)) {
      // 再次尝试驼峰命名的 key 是否存在
      res[key] = hash[altKey];
      if (!preserve) {
        delete hash[altKey];
      }
      return true;
    }
  }
  return false;
}
