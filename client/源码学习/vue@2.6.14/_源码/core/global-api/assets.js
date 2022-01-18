/* @flow */

import { ASSET_TYPES } from 'shared/constants';
import { isPlainObject, validateComponentName } from '../util/index';

// 添加 component、filter、directive 静态方法 -- 注册全局资源
export function initAssetRegisters(Vue: GlobalAPI) {
  /**
   * Create asset registration methods. 创建资产注册方法
   */
  ASSET_TYPES.forEach((type) => {
    Vue[type] = function(
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id);
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id;
          definition = this.options._base.extend(definition);
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = {
            bind: definition,
            update: definition,
          };
        }
        this.options[type + 's'][id] = definition;
        return definition;
      }
    };
  });
}
