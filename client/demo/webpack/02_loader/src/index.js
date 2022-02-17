import test from './js/test';
import _ from 'lodash';
import './index.css';

window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.log(msg, url, lineNo, columnNo, error);
};

const a = 2;

class b {}

console.log(_.join(['Hello', 'webpack'], ' '));
