// 定义 NonEmptyArray 工具类型，用于确保数据非空数组。

// 自己的实现
// type NonEmptyArray<T> = {
//   [P: number]: T;
//   0: T;
// };

// 参考1
// type NonEmptyArray<T> = T[] & { 0: T };
// 参考2
type NonEmptyArray<T> = [T, ...T[]];

const a: NonEmptyArray<string> = []; // 将出现编译错误
const b: NonEmptyArray<string> = ['Hello TS']; // 非空数据，正常使用

export {};
