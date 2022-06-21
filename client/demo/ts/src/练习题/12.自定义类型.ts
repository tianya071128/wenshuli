/**
 * 用于将交叉类型进行扁平化处理
 */
type Simplify<T> = {
  [P in keyof T]: T[P];
};

/**
 * SetOptional<Type, Keys>：支持把给定的 keys 对应的属性变成可选的？
 */
type SetOptional<T, K extends keyof T> = Simplify<
  Partial<Pick<T, K>> & Omit<T, K>
>;
{
  type Foo = {
    a: number;
    b?: string;
    c: boolean;
  };

  type SomeOptional = SetOptional<Foo, 'a' | 'b'>;
  const test: SomeOptional = {
    c: true,
    a: 2,
  };
}

/**
 * SetRequired<Type, Kyes>：把指定的 keys 对应的属性编程必填的
 */
type SetRequired<T, K extends keyof T> = Simplify<
  Required<Pick<T, K>> & Omit<T, K>
>;
{
  type Foo = {
    a?: number;
    b: string;
    c?: boolean;
  };

  // 测试用例
  type SomeRequired = SetRequired<Foo, 'b' | 'c'>;
}
