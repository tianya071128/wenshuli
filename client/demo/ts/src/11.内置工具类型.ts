// TypeScript 提供了几种实用程序类型来促进常见的类型转换，这些实用程序在全局范围内可用。

/**
 * Partial<Type>：构造一个类型，其中 Type 的所有属性都设置为可选。
 */
{
  // 源码
  type Partial<T> = { [P in keyof T]?: T[P] };

  // demo
  interface Todo {
    title: string;
    description: string;
  }

  type FieldsToUpdate = Partial<Todo>;
}

/**
 * Required<Type>：构造一个类型，其中 Type 的所有属性都为必选
 */
{
  // 源码
  type Required<T> = { [P in keyof T]-?: T[P] };

  // demo
  interface Props {
    a?: number;
    b?: string;
  }

  type Props2 = Required<Props>;
}

/**
 * Readonly<Type>：构造一个类型，其中 Type 的所有属性都设置为只读。
 */
{
  // 源码
  type Readonly<T> = { readonly [P in keyof T]: T[P] };

  // demo
  interface Todo {
    title: string;
  }
  type Todo2 = Readonly<Todo>;
}

/**
 * Record<Keys, Type>：构造一个对象类型，其属性键为 Keys，其属性值为 Type。
 */
{
  // 源码
  type Record<K extends keyof any, T> = { [P in K]: T };

  // demo
  interface CatInfo {
    age: number;
    breed: string;
  }
  type CatName = 'miffy' | 'boris' | 'mordred';
  const cats: Record<CatName, CatInfo> = {
    miffy: { age: 10, breed: 'Persian' },
    boris: { age: 5, breed: 'Maine Coon' },
    mordred: { age: 16, breed: 'British Shorthair' },
  };
}

/**
 * Pick<Type, Keys>：通过从 Type 中选择一组属性 Keys（字符串文字或字符串文字的联合）来构造一个类型。
 */
{
  type Pick<T, K extends keyof T> = { [P in K]: T[P] };

  // demo
  interface Todo {
    title: string;
    description: string;
    completed: boolean;
  }

  type TodoPreview = Pick<Todo, 'title' | 'completed'>;
}

/**
 * Omit<Type, Keys>：通过从 Type 中选择所有属性然后删除 Keys（字符串文字或字符串文字的联合）来构造一个类型。
 */
{
  // type Omit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] }
  type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
  // demo
  interface Todo {
    title: string;
    description: string;
    completed: boolean;
    createdAt: number;
  }

  type TodoPreview = Omit<Todo, 'description'>;
}

/**
 * Exclude<UnionType, ExcludedMembers>：通过从 UnionType 中排除可分配给 ExcludedMembers 的所有联合成员来构造类型。
 */
{
  type Exclude<T, U> = T extends U ? never : T;

  // demo
  type T0 = Exclude<'a' | 'b' | 'c', 'a'>;
}

/**
 * Extract<Type, Union>：通过从 Type 中提取所有可分配给 Union 的联合成员来构造一个类型。
 */
{
  type Extract<T, U> = T extends U ? T : never;

  type T0 = Extract<'a' | 'b' | 'c', 'a' | 'f'>;
  type T1 = Extract<string | number | (() => void), Function>;
}

/**
 * NonNullable<Type>：从 Type 中排除 null 和 undefined 来构造一个类型。
 */
{
  // type NonNullable<T> = T extends undefined | null ? never : T;
  type NonNullable<T> = T extends null | undefined ? never : T;

  type T0 = NonNullable<string | number | undefined>;
}

/**
 * Parameters<Type>：从函数类型 Type 的参数中使用的类型构造元组类型 -- 获取函数参数元祖
 */
{
  // type Parameters<T extends (...args: any[]) => any> = T extends (
  //   ...args: infer Parame
  // ) => any
  //   ? Parame
  //   : never;
  type Parameters<T extends (...args: any) => any> = T extends (
    ...args: infer P
  ) => any
    ? P
    : never;

  type T1 = Parameters<(s: string) => void>;
  type T2 = Parameters<(...args: string[]) => void>;
}

/**
 * ConstructorParameters<Type>：从构造函数类型的类型构造元组或数组类型。它产生一个包含所有参数类型的元组类型（如果 Type 不是函数，则类型 never ）。
 */
{
  // type ConstructorParameters<
  //   T extends new (...args: any) => any
  // > = T extends new (...args: infer P) => any ? P : never;
  type ConstructorParameters<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer P) => any ? P : never;

  type T0 = ConstructorParameters<ErrorConstructor>;
  type T1 = ConstructorParameters<FunctionConstructor>;
}

/**
 * ReturnType<Type>：构造一个由函数 Type 的返回类型组成的类型。
 */
{
  // type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : never;
  type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

  type T0 = ReturnType<() => string>;
  type T2 = ReturnType<<T>() => T>;
}

/**
 * 
 */
