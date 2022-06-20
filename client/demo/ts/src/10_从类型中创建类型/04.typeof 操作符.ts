/**
 * 3. Typeof 类型运算符 - 使用typeof运算符创建新类型: 用来获取一个变量声明或对象的类型
 *
 *    --> 在 JS 中已经存在一个 typeof 运算符, 是在 JS 表达式上下文中使用的
 *    --> 而在 TS 中的 typeof 运算符, 是在 TS 的类型上下文中使用它来引用变量或属性的类型
 */
interface Person2 {
  name: string;
  age: number;
}

const sem: Person2 = { name: 'semlinker', age: 33 };
type Sem = typeof sem; // -> Person2

function toArray(x: number): Array<number> {
  return [x];
}

type Func = typeof toArray; // -> (x: number) => number[]

// 注意，这个是用来获取 JS 的变量的类型的，所以不能用于操作 ts 的类型
type str = string;
// type str2 = typeof str; Error：“str”仅表示类型，但在此处却作为值使用。
