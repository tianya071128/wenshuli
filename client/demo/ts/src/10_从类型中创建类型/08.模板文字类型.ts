/**
 * 模板文字类型建立在字符串文字类型之上，并且能够通过联合扩展成许多字符串。
 *
 *  语法类似与 JS 的模板字符串，但是用于类型
 */
// demo
type EmailLocaleIDs = "welcome_email" | "email_heading";
type FooterLocaleIDs = "footer_title" | "footer_sendoff";
 
type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`;


/**
 * TypeScript 包含一组可用于字符串操作的类型。这些类型内置于编译器以提高性能，在 TypeScript 包含的 .d.ts 文件中找不到。
 */
// 1. Uppercase<Type>：将字符串中的每个字符转换为大写版本。
type Greeting = "Hello, world"
type ShoutyGreeting = Uppercase<Greeting> 
// 其他的参阅文档


