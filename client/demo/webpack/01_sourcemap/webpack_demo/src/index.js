import _ from 'lodash';

window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.log(msg, url, lineNo, columnNo, error);
};

const a = 2;

class b {}

// console.log(_.join(['Hello', 'webpack'], ' '));

console.log(window.a.c);
