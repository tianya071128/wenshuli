// 使用类型别名定义一个 EmptyObject 类型，使得该类型只允许空对象赋值：
type EmptyObject = {
  [K: keyof any]: never;
};

// 测试用例
const shouldPass: EmptyObject = {}; // 可以正常赋值
// 将出现编译错误 - OK
// const shouldFail: EmptyObject = {
//   prop: 'TS',
// };

// 更改以下 takeSomeTypeOnly 函数的类型定义，让它的参数只允许严格 SomeType 类型的值
type SomeType = {
  prop: string;
};

type Exclusive<T1, T2 extends T1> = {
  [K in keyof T2]: K extends keyof T1 ? T2[K] : never;
};

// 更改以下函数的类型定义，让它的参数只允许严格 SomeType 类型的值
function takeSomeTypeOnly<T extends SomeType>(x: Exclusive<SomeType, T>) {
  return x;
}

// 测试用例：
const x = { prop: 'a' };
takeSomeTypeOnly(x); // 可以正常调用

const y = { prop: 'a', addditionalProp: 'x' };
// takeSomeTypeOnly(y); // 将出现编译错误
