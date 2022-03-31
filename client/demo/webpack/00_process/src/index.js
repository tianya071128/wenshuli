import { test } from 'babel-loader!./module/module01';
import './module/module02';
import MyImage from './img/01.png';
console.log('全流程构建', test, MyImage);

import('./chunk/chunk01').then(({ chunk }) => {
  chunk();
});

export function exportTest() {
  console.log('导出一个模块试试');
}
