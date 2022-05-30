import test from './js/test';
import _ from 'lodash';
import './index.css';
import img from './image/01.png';

console.log(test, img);

window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.log(msg, url, lineNo, columnNo, error);
};

const a = 2;

class b {}

console.log(_.join(['Hello', 'webpack'], ' '));

console.log('文件发生变动');
