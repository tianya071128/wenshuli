export default function test() {
  console.log('这是一个普通同步模块');
}

import('../chunk/chunk01').then(({ test }) => {
  test();
});
