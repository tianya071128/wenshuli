import test from './module/module01';

test();

import('./chunk/chunk01').then(({ test }) => {
  test();
});
