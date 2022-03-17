// import 'core-js';
// import 'regenerator-runtime/runtime';
// import '@babel/polyfill';
import 'eslint';

let a = 1;

let b = () => {};

let obj = new Proxy(
  {},
  {
    get: function(target, propKey, receiver) {
      console.log(`getting ${propKey}!`);
      return Reflect.get(target, propKey, receiver);
    },
    set: function(target, propKey, value, receiver) {
      console.log(`setting ${propKey}!`);
      return Reflect.set(target, propKey, value, receiver);
    },
  }
);

Object.defineProperty({}, 'test', {
  value: '2',
});

const fn = async function() {
  await new Promise();
};

class classTest {}
