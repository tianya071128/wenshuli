/**
 * 有时一种类型需要基于另一种类型，此时可采用映射类型
 *
 *  语法：建立在索引类型之上，通常使用 in 关键字来遍历键(通常通过 keyof 创建的联合类型，或任意联合类型)以创建类型：
 *    [Key in 联合类型]: Type
 */
// demo：获取泛型 Type 的所有属性并将其值更改为布尔值。
type OptionsFlags<Type> = {
  [Property in keyof Type]: boolean;
};
type FeatureFlags = {
  darkMode: () => void;
  newUserProfile: () => void;
};

type FeatureOptions = OptionsFlags<FeatureFlags>;

/**
 * 映射修饰符：在映射期间可以应用两个额外的修饰符：readonly 和 ?，分别影响只读和可选
 *              通过前缀 - 或 + 来删除或添加这些修饰符。如果您不添加前缀，则假定为 +。
 */
// demo2：删除 “readonly” 前缀，所有属性都是可写可读的
type CreateMutable<Type> = {
  -readonly [Property in keyof Type]: Type[Property];
};

type LockedAccount = {
  readonly id: string;
  readonly name: string;
};

type UnlockedAccount = CreateMutable<LockedAccount>;

// demo3:删除可选属性，所有属性都是必须的
type Concrete<Type> = {
  [Propertry in keyof Type]-?: Type[Propertry];
};
type MaybeUser = {
  id: string;
  name?: string;
  age?: number;
};

type User = Concrete<MaybeUser>;

/**
 * 使用 as 子句重新映射类型的键：
 *  -> 从以前的属性名称中创建新的属性名称
 *  -> 通过条件类型生成 never 来过滤掉键
 *  -> 。。。
 */
// demo：利用模板文字类型等功能从以前的属性名称中创建新的属性名称：
type Getters<Type> = {
  [Property in keyof Type as `get${Capitalize<string & Property>}`]: Type[Property]
}
interface Person {
  name: string;
  age: number;
  location: string;
}

type LazyPerson = Getters<Person>;

// demo：通过条件类型生成 never 来过滤掉键
type RemoveKindField<Type, Keys extends keyof Type> = {
  [Property in keyof Type as Property extends Keys ? never : Property]: Type[Property]
}
interface Circle2 {
    kind: "circle";
    radius: number;
}
 
type KindlessCircle = RemoveKindField<Circle2, 'kind'>;

