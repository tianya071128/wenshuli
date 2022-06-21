/**
 * 1. extends 语句，如果左边是联合类型，会依次执行，并返回一个联合类型
 */
// 所以下面的语句中，T 是联合类型会依次执行
// type Exclude<T, U> = T extends U ? never : T;

type T0 = Exclude<'a' | 'b' | 'c', 'a'>;

/**
 * 对于元祖类型，也可以通过 ...来合并元祖
 */
type arr1 = [string, number];
type arr2 = [boolean, undefined];
type arr3 = [...arr1, ...arr2];

const map = {
  G: 'C',
  C: 'G',
  T: 'A',
  A: 'U',
};
export function toRna(DNA: string) {
  let res = '';
  for (const str of DNA) {
    let s: string;
    if ((s = map[str as keyof typeof map])) {
      res += s;
    } else {
      throw new Error('Invalid input DNA.');
      // return 'Invalid input DNA.';
    }
  }
  return res;
}
