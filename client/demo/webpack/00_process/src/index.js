import { test, test2 } from 'babel-loader!./module/module01';
import './module/module02';
console.log('全流程构建', test, test2);

import('./chunk/chunk01').then(({ chunk }) => {
  chunk();
});

export function exportTest() {
  console.log('导出一个模块试试');
}
