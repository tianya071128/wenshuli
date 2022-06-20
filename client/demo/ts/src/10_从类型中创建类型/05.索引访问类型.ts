/**
 * 索引访问类型 - 使用Type['a']语法访问类型的子集: 类似于对象属性读取
 */
// demo1
type Person3 = { age: number; name: string; alive: boolean };
type Age = Person3['age']; // type Age = number
type I1 = Person3['age' | 'name']; // type I1 = string | number
type I2 = Person3[keyof Person3]; // type I2 = string | number | boolean
type AliveOrName = 'alive' | 'name';
type I3 = Person3[AliveOrName]; // type I3 = string | boolean
// type I4 = Person2['alve']; // Error：尝试索引不存在的属性, 会抛出错误 - 类型“Person2”上不存在属性“alve”。

// demo2: 用于获取数组元素的类型
const MyArray = [
  { name: 'Alice', age: 15 },
  { name: 'Bob', age: 23 },
  { name: 'Eve', age: 38 },
];
type Person4 = typeof MyArray[number]; // 读取出数组元素的类型 --> type Person4 = { name: string; age: number;}
type Age2 = typeof MyArray[number]['age']; // 读取出数组元素类型继续读取类型子集 --> type Age2 = number
