// import { test, test2 } from 'babel-loader!./module/module01';
// import './module/module02';
// import MyImage from './img/01.png';
// console.log('全流程构建', test, test2, MyImage);

// import('./chunk/chunk01').then(({ chunk }) => {
//   chunk();
// });

// export function exportTest() {
//   console.log('导出一个模块试试');
// }

import MyImage from './img/01.png';

class Test {}

console.log('全流程构建', MyImage, Test, Array.prototype.fill);

import _createClass from '@babel/runtime/helpers/createClass';
import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import 'core-js/modules/es.array.fill.js';
import MyImage from './img/01.png';

var Test = /*#__PURE__*/ _createClass(function Test() {
  _classCallCheck(this, Test);
});

console.log('全流程构建', MyImage, Test, Array.prototype.fill);
