/**
 * 枚举是 TS 的少数会影响运行时的功能，不是 JS 的类型级扩展
 *  也就是最终会被编译到 JS 的运行时代码
 */
/**
 * 数字枚举：可以不进行初始化，此时初始成员默认初始器为 0，后续所有成员从该点开始自动递增
 */
enum Direction {
  Up,
  Down,
  Left,
  Right,
}
// 使用枚举很方便，只需将任何成员作为枚举本身的属性访问，并使用枚举的名称声明类型
console.log(Direction.Up);

/**
 * 字符串枚举：每个成员都必须使用字符串文字或另一个字符串枚举成员进行常量初始化。
 */
enum Direction2 {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

/**
 * 异构枚举：枚举成员可以是字符串和数字成员混合，但是最好不要这样做
 */
enum BooleanLikeHeterogeneousEnum {
  No = 0,
  Yes = 'YES',
}

/**
 * 编译时的枚举：可以使用 keyof typeof 来获取将所有 Enum 键表示为字符串的 Type。
 */
type LogLevelStrings = keyof typeof Direction2;
