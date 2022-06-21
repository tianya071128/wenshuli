// 定义一个 NativeFlat 工具类型，支持把数组类型拍平（扁平化）。具体的使用示例如下所示：
// 我的实现 - 还是查看了答案
// type NaiveFlat<T extends any[]> = {
//   [P in keyof T]: T[P] extends any[] ? T[P][number] : T[P];
// }[number];
type NaiveFlat<T extends any[]> = T[number] extends any[]
  ? T[number][number]
  : T[number];

// 测试用例：
type NaiveResult = NaiveFlat<[['a'], ['b', 'c'], ['d']]>; // NaiveResult的结果： "a" | "b" | "c" | "d"

// 继续实现 DeepFlat 工具类型，以支持多维数组类型：
// 我的实现 - 还是查看了答案
type DeepFlat<T extends any[]> = T[number] extends (infer U)[]
  ? U extends any[]
    ? DeepFlat<U>
    : U
  : T[number]; // 你的实现代码

// 测试用例
type Deep = [['a'], ['b', 'c'], [['d']], [[[['e']]]]];
type DeepTestResult = DeepFlat<Deep>; // DeepTestResult: "a" | "b" | "c" | "d" | "e"
