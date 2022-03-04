/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @template T @typedef {function(): T} FunctionReturning */

/**
 * 缓存传入函数的调用结果，只调用一次，后续调用返回缓存的调用结果
 * @template T
 * @param {FunctionReturning<T>} fn memorized function 记忆函数
 * @returns {FunctionReturning<T>} new function 新的函数
 */
const memoize = fn => {
	let cache = false;
	/** @type {T} */
	let result = undefined;
	return () => {
		if (cache /** 通过闭包引用 fn 调用结果 */) {
			return result; // 存在调用结果，直接返回
		} else {
			// 但是这里没有获取参数，应该是缓存的函数不需要参数
			result = fn(); // 初次调用，缓存一下结果
			cache = true;
			// Allow to clean up memory for fn 允许清除 fn 的内存
			// and all dependent resources 以及所有依赖的资源
			fn = undefined;
			return result;
		}
	};
};

module.exports = memoize;
