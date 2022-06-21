export {};

export interface Cloner {
  A: number;
}

export interface Cloner {
  B: number;
}

/**
 * 合并接口：
 *  1. 如果两个接口中同时声明了同名的非函数成员且它们的类型不兼容，则编译器会报错。
 *  2. 对于函数成员，每个同名函数声明都会被当成这个函数的一个重载。 同时需要注意，当接口 A与后来的接口 A合并时，后面的接口具有更高的优先级。
 */
