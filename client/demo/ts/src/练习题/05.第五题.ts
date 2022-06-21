// 定义一个工具类型 AppendArgument，为已有的函数类型增加指定类型的参数，新增的参数名是 x，将作为新函数类型的第一个参数。

// 我的实现 -- 还是看了答案，唉
type test<K, T> = { [P in keyof T]: T[P] };
type AppendArgument<F extends (...args: any) => any, A> = (
  x: boolean,
  ...args: Parameters<F>
) => ReturnType<F>;

// good 实现
// 定义非空元组约束类型
type NonEmptyTuple = [unknown, ...unknown[]];
// 1. 使用 Parameters 和 ReturnType 工具类型实现
type AppendArgument2<
  F extends (...arg: any) => any,
  T extends NonEmptyTuple
> = (...args: [...T, ...Parameters<F>]) => ReturnType<F>;

type FinalFn2 = AppendArgument2<Fn, [boolean, number]>; // (args_0: boolean, args_1: number, args_2: number, args_3: string) => number
// 2. 使用 infer 方式实现
// 非空元组类型
type AppendArgument3<F, T extends NonEmptyTuple> = F extends (
  ...args: infer Args
) => infer Reture
  ? (...args: [...T, ...Args]) => Reture
  : never;

type FinalFn3 = AppendArgument3<Fn, [boolean, number]>;

// test
type Fn = (a: number, b: string) => number;
type FinalFn = AppendArgument<Fn, boolean>; // (x: boolean, a: number, b: string) => number
