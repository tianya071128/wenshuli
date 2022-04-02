import { test } from './module/module01';

import('./chunk/chunk01').then(({ chunk }) => chunk());

export function exportTest() {}
