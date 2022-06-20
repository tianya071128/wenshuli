/**
 * 2. Keyof 类型运算符
 *       - 使用 keyof 运算符创建新类型: 用于获取对象类型的所有键，其返回类型是联合类型。
 */
type Point7 = { x: number; y: number };
type P = keyof Point7; // 此时类型 P 相当于联合类型 "x" | "y"
const p: P = 'x';
// const p2: P = 'x2'; // Error: 不能将类型“"x2"”分配给类型“keyof Point7”。

// 当类型具有 string 或 number 索引签名, keyof 则返回这些类型
type Arrayish = { [n: number]: unknown };
type A = keyof Arrayish; // type A = number

// 当具有 string 索引签名时, 此时 keyof 获取到的是 string | number --> 这是因为 JavaScript 对象键始终强制转换为字符串，因此 obj[0] 始终与 obj["0"] 相同.
type Mapish = { [k: string]: boolean; x: boolean };
type M = keyof Mapish; // type M = string | number

/**
 * keyof 其他数据类型时，可以看出，会获取到对应数据具有的方法的 key
 */
type b = keyof boolean; // type b = "valueOf"
type s = keyof string; // type s = number | typeof Symbol.iterator | "toString" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | ... 37 more ... | "at"
type a = keyof Array<string>; // 这种类似于 keyof { [n: number]: unknown }
const aa: a = 2;
