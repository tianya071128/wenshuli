import _ from 'lodash';
import test from './test';
import './index.css';

window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.log(msg, url, lineNo, columnNo, error);
};

const a = 2;

class b {}

console.log(_.join(['Hello', 'webpack'], ' '));
