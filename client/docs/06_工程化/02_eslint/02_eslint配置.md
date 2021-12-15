---
title: ESLint 配置
date: 2021-10-21 15:00:00
permalink: /eslint/config
categories: -- 工程化
  -- eslint
tags:
  - null
---

# 配置

有两种主要的配置方式：

* 使用 JS 注释把配置信息直接嵌入到一个代码源文件中。一般不推荐使用
* 使用 JS、JSON或YAML文件为整个目录和它的子目录指定配置信息。

## 配置文件

ESLint 支持如下几种的配置文件，优先级如下：

1. `.eslintrc.js`：输出一个配置对象。
2. `.eslintrc.yaml`
3. `.eslintrc.yml`
4. `.eslintrc.json`
5. `.eslintrc`：已被弃用
6. `package.json`：在 package.json 里创建一个 eslintConfig属性，在那里定义你的配置。

::: warning 注意

ESLint 不会在找到一个配置文件后就停止，默认情况下会在所有父级目录寻找配置文件，一直到根目录，综合寻找到的配置文件合并成最终的配置项，可以设置 `“root": true` 停止在父目录下寻找。

如果在同一目录下找到多个配置文件，那么优先级就遵照上述的优先级。

:::

## 完整的配置优先级

完整的配置层次结构，从最高优先级最低的优先级，如下：

1. 行内配置
   1. `/*eslint-disable*/` 和 `/*eslint-enable*/`
   2. `/*global*/`
   3. `/*eslint*/`
   4. `/*eslint-env*/`
2. 命令行选项（或 CLIEngine 等价物）：
   1. `--global`
   2. `--rule`
   3. `--env`
   4. `-c`、`--config`
3. 项目级配置：
   1. 与要检测的文件在同一目录下的 `.eslintrc.*` 或 `package.json` 文件
   2. 继续在父级目录寻找 `.eslintrc` 或 `package.json`文件，直到根目录（包括根目录）或直到发现一个有`"root": true`的配置。
4. 如果不是（1）到（3）中的任何一种情况，退回到 `~/.eslintrc` 中自定义的默认配置。

## 配置文件详解

如下为配置文件的配置项：

::: details 展开查看

```js
module.exports = {
	// 停止在父级目录中寻找配置文件
	"root": true,
  
  	// 配置全局变量 - 这样就可以在文件中访问在文件中未定义的全局变量
	"globals": {
		"var1": "readonly", // writable: 允许重写变量 | readonly: 不允许重写变量
	},
  
  // 预定义的全局变量 - 这些环境并不是互斥的，所以你可以同时定义多个。
	"env": {
		"browser": true, // 浏览器环境中的全局变量。
		"es2021": true,
		"node": true,
	},
  
	// 解析器配置项，会被传入至解析器中，eslint 默认为 Espree，但使用 babel 时需要使用 “babel-eslint”
	"parserOptions": {
		"parser": "babel-eslint", // 配置解析器 - 也可在根部设置 "parser": "babel-eslint"
		"sourceType": "module", // 支持类型 - script（默认） | module（模块）
		"ecmaVersion": 6, // 支持es6语法，但并不意味着同时支持新的 ES6 全局变量或类型（比如 Set 等新类型）
		"ecmaFeatures": { // 这是个对象，表示你想使用的额外的语言特性
			"jsx": true, // 启用 JSX
			"globalReturn": true, // 允许在全局作用域下使用 return 语句
			"impliedStrict": true, // 启用全局 strict mode (如果 ecmaVersion 是 5 或更高)
			"experimentalObjectRestSpread": true, // 启用实验性的 object rest/spread properties 支持。(重要：这是一个实验性的功能,在未来可能会有明显改变。 建议你写的规则 不要 依赖该功能，除非当它发生改变时你愿意承担维护成本。)
		}
	},
	// 使用第三方插件 - 插件名称可以省略 eslint-plugin- 前缀。
	// 在使用插件之前，必须使用 npm 安装它。
	"plugins": [
		// "plugin1",
		// "eslint-plugin-plugin2"
	],
	/**
	* 一个配置文件可以被基础配置中的已启用的规则继承。 --- ESLint递归地扩展配置，因此基本配置也可以具有 extends 属性。extends 属性中的相对路径和可共享配置名从配置文件中出现的位置解析。
	* 也可以在 rules 属性中以扩展（或覆盖）规则
	* 属性值可以是：
	* 	1. 指定配置的字符串(配置文件的路径、可共享配置的名称、eslint:recommended 或 eslint:all)
	* 	2. 字符串数组：每个配置继承它前面的配置
	*/
	"extends": "eslint:recommended",
	// 修改项目中的规则，可以在这里配置，同时也可以在文件中配置
	/**
	* "off" 或 0 - 关闭规则
	* "warn" 或 1 - 开启规则，使用警告级别的错误：warn (不会导致程序退出)
	* "error" 或 2 - 开启规则，使用错误级别的错误：error (当被触发的时候，程序会退出)
	*/
	"rules": {
		// 当为数组时，第一个表示规则的严重等级，后面的表示传递给规则的参数
		// 'indent': [2, "tab"], // 强制使用一致的缩进
	},
	// 同一个目录下的文件需要有不同的配置 - overrides 中的配置项可以细粒化匹配不同的文件
	"overrides": [
		{
			"files": ["*-test.js", "*.spec.js"],
			"rules": {
				"no-unused-expressions": "off"
			}
		}
	],
	// 将提供给每一个将被执行的规则 - 在自定义规则的时候，可以访问到以下配置信息
	"settings": {
		"sharedData": "Hello"
	}
}
```

:::



### globals：配置全局变量

当访问当前源文件未定义并且不在 `env` 预设的环境全局变量时，ESLint 会发出警告。此时可以通过 `globals` 配置全局变量，有如下三种模式配置：

* "writable"：允许重写变量

* "readonly"：不允许重写变量 -- 要启用 [no-global-assign](https://eslint.bootcss.com/docs/rules/no-global-assign) 规则来禁止对只读的全局变量进行修改。

* "off"：禁用全局变量。例如，在大多数 ES2015 全局变量可用但 `Promise` 不可用的环境中，你可以使用这个配置

```js
{
    "globals": {
        "var1": "writable",
        "var2": "readonly"
    }
}
```

::: tip 提示

由于历史原因，布尔值 `false` 和字符串值 `"readable"` 等价于 `"readonly"`。类似地，布尔值 `true` 和字符串值 `"writeable"` 等价于 `"writable"`。但是，不建议使用旧值。

:::

### env：配置指定环境

一个环境定义了一组**预定义的全局变量**。可用的环境如下：

- `browser` - 浏览器环境中的全局变量。
- `node` - Node.js 全局变量和 Node.js 作用域。
- `commonjs` - CommonJS 全局变量和 CommonJS 作用域 (用于 Browserify/WebPack 打包的只在浏览器中运行的代码)。
- `shared-node-browser` - Node.js 和 Browser 通用全局变量。
- `es6` - 启用除了 modules 以外的所有 ECMAScript 6 特性（该选项会自动设置 `ecmaVersion` 解析器选项为 6）。
- `worker` - Web Workers 全局变量。
- `amd` - 将 `require()` 和 `define()` 定义为像 [amd](https://github.com/amdjs/amdjs-api/wiki/AMD) 一样的全局变量。
- `mocha` - 添加所有的 Mocha 测试全局变量。
- `jasmine` - 添加所有的 Jasmine 版本 1.3 和 2.0 的测试全局变量。
- `jest` - Jest 全局变量。
- `phantomjs` - PhantomJS 全局变量。
- `protractor` - Protractor 全局变量。
- `qunit` - QUnit 全局变量。
- `jquery` - jQuery 全局变量。
- `prototypejs` - Prototype.js 全局变量。
- `shelljs` - ShellJS 全局变量。
- `meteor` - Meteor 全局变量。
- `mongo` - MongoDB 全局变量。
- `applescript` - AppleScript 全局变量。
- `nashorn` - Java 8 Nashorn 全局变量。
- `serviceworker` - Service Worker 全局变量。
- `atomtest` - Atom 测试全局变量。
- `embertest` - Ember 测试全局变量。
- `webextensions` - WebExtensions 全局变量。
- `greasemonkey` - GreaseMonkey 全局变量。

这些环境并不互斥的，可以定义多个环境：

```js
{
    "env": {
        "browser": true,
        "node": true
    }
}
```

### parser：配置解析器

ESLint 默认使用 [Espree](https://github.com/eslint/espree) 作为其解析器，也可通过 `parser` 配置不同的解析器：

```js
{
    "parser": "babel-eslint",
    "rules": {
        "semi": "error"
    }
}
```

以下解析器与 ESLint 兼容(自定义解析器应该与 ESLint 兼容，否则会出现意料的 bug)：

* Esprima
* Babel-ESLint - 一个对Babel解析器的包装，使其能够与 ESLint 兼容。
* @typescript-eslint/parser - 将 TypeScript 转换成与 estree 兼容的形式，以便在ESLint中使用。

不管是使用默认解析器还是自定义解析器，配置属性 `parserOptions` 仍然是必须的。解析器会被传入 `parserOptions`，但是不一定会使用它们来决定功能特性的开关。

### parserOptions：解析器配置项

默认情况下，解析器解析的语法支持 ECMAScript5 语法，可以通过 `parserOptions` 传递给解析器，让解析器支持更多的语法，例如支持 JSX、ECMAScript最新语法等。

**设置解析器选项能帮助 ESLint 确定什么是解析错误，所有语言选项默认都是 `false`。**

可用的选项有：

- `ecmaVersion` - 默认设置为 3，5（默认）， 你可以使用 6、7、8、9 或 10 来指定你想要使用的 ECMAScript 版本。你也可以用使用年份命名的版本号指定为 2015（同 6），2016（同 7），或 2017（同 8）或 2018（同 9）或 2019 (same as 10)
- `sourceType` - 设置为 `"script"` (默认) 或 `"module"`（如果你的代码是 ECMAScript 模块)。
- ecmaFeatures \- 这是个对象，表示你想使用的额外的语言特性:
  - `globalReturn` - 允许在全局作用域下使用 `return` 语句
  - `impliedStrict` - 启用全局 [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) (如果 `ecmaVersion` 是 5 或更高)
  - `jsx` - 启用 [JSX](http://facebook.github.io/jsx/)
  - `experimentalObjectRestSpread` - 启用实验性的 [object rest/spread properties](https://github.com/sebmarkbage/ecmascript-rest-spread) 支持。(**重要**：这是一个实验性的功能,在未来可能会有明显改变。 建议你写的规则 **不要** 依赖该功能，除非当它发生改变时你愿意承担维护成本。)

```js
{
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        }
    },
    "rules": {
        "semi": "error"
    }
}
```

::: warning 注意

当使用自定义解析器时，这些配置项也会传递给自定义的解析器，并且可以自定义属性来扩展配置。

例如在 vue-cli 创建的项目中，生成的 `.eslintrc.js` 中的 `parserOptions` 配置项就存在 `parser:babel-eslint` ，这个最终是传递给 `vue-eslint-parser` 解析器使用的

```js
parserOptions: {
  // 解析器选项 - 这是自定义选项，最终会传递给 vue-eslint-parser 解析器使用
  parser: 'babel-eslint',
},
```

:::

### plugins：配置插件

ESLint 的插件具有很多功能，[具体可见](/eslint/plugins)

配置文件中通过 `plugins` 使用插件，插件名称可以省略 `eslint-plugin-` 前缀。

```js
{
    "plugins": [
        "plugin1",
        "eslint-plugin-plugin2"
    ]
}
```

### rules：配置规则

ESLint 附带了大量的核心规则。也可通过 `plugins` 扩展其他的规则，语法如下：

- `"off"` 或 `0` - 关闭规则
- `"warn"` 或 `1` - 开启规则，使用警告级别的错误：`warn` (不会导致程序退出)
- `"error"` 或 `2` - 开启规则，使用错误级别的错误：`error` (当被触发的时候，程序会退出)

```js
{
    "plugins": [
        "plugin1"
    ],
    "rules": {
        "eqeqeq": "off",
        "curly": "error",
         // 如果是数组，第一项是规则的严重程度，其他项都是给规则额外的选项
        "quotes": ["error", "double"],
        // 使用插件的规则：插件/规则名
        "plugin1/rule1": "error"
    }
}
```

**注意：**当指定来自插件的规则时，确保删除 `eslint-plugin-` 前缀。ESLint 在内部只使用没有前缀的名称去定位规则。

### extends：扩展配置

使用 `extends` 来继承配置，`extends` 的值可以是：

* 指定配置的字符串(配置文件的路径、可共享配置的名称、`eslint:recommended` 或 `eslint:all`)
* 字符串数组：每个配置继承它前面的配置 - **也就是后面的优先级会更高**

可使用的扩展配置如下：

* eslint:recommended：ESLint 内置扩展配置，启用一系列核心规则。
* eslint:all：ESLint 内置扩展配置，启用当前安装的 ESLint 中所有的核心规则。不推荐使用
* 可共享的配置：是一个 npm 包，输出一个配置对象。可以省略包名的前缀 `eslint-config-`。例如：eslint-config-standard
* 插件共享的配置：**插件通常输出规则，但也可以输出一个或多个命名的配置**。使用格式为：`plugin:插件名(省略eslint-plugin前缀)/配置名称`
* 配置文件的路径：ESLint 解析一个相对于使用它的配置文件的基本配置文件的相对路径。

```js
extends: [
  // ESLint 核心规则
  "eslint:recommended",
  
  // 可共享的配置：eslint-config-standard
  "standard",
  
  // 插件共享的配置: eslint-plugin-vue
  "plugin:vue/essential",
  
  // 配置文件的路径
  './node_modules/coding-standard/.eslintrc-jsx',
],
```

::: warning 注意

1. ESLint递归地扩展配置，因此基本配置也可以具有 `extends` 属性。
2. 扩展配置可能会扩展或覆盖规则，扩展规则如下：
   - 启用额外的规则
   - 改变继承的规则级别而不改变它的选项：
     - 基础配置：`"eqeqeq": ["error", "allow-null"]`
     - 派生的配置：`"eqeqeq": "warn"`
     - 最后生成的配置：`"eqeqeq": ["warn", "allow-null"]`
   - 覆盖基础配置中的规则的选项
     - 基础配置：`"quotes": ["error", "single", "avoid-escape"]`
     - 派生的配置：`"quotes": ["error", "single"]`
     - 最后生成的配置：`"quotes": ["error", "single"]`

:::

### overrides：更精细的配置

[具体参考](https://eslint.bootcss.com/docs/user-guide/configuring#configuration-based-on-glob-patterns)

**v4.1.0+.** 有时，你可能需要更精细的配置，比如，如果同一个目录下的文件需要有不同的配置。

```js
{
  "overrides": [
    {
      "files": ["bin/*.js", "lib/*.js"],
      "excludedFiles": "*.test.js",
      "rules": {
        "quotes": ["error", "single"]
      }
    }
  ]
}
```



## 文件禁用规则

### 整个文件禁用规则

将 `/* eslint-disable */` 代码块放在文件顶部

```js
/* eslint-disable */

alert('foo');
```

或者禁用文件部分规则 `/* eslint-disable 规则名1 规则名2 */` 放在文件顶部

```js
/* eslint-disable no-alert */

alert('foo');
```

### 文件部分禁用规则

使用如下的注释块对文件部分禁用规则：使用 `eslint-enable` 结束禁用规则

```js
/* eslint-disable no-alert, no-console */

alert('foo');
console.log('bar');

/* eslint-enable no-alert, no-console */
```

### 对文件某一行禁用规则

使用 `eslint-disable-next-line` 禁用下一行的规则 或 `eslint-disable-line` 禁用同一行的规则

```js
alert('foo'); // eslint-disable-line

// eslint-disable-next-line
alert('foo');

/* eslint-disable-next-line */
alert('foo');

alert('foo'); /* eslint-disable-line */
```

## 忽略文件：.eslintignore

在项目根目录创建一个 `.eslintignore` 文件告诉 ESLint 忽略的文件或目录，使用 [.gitignore 规范](http://git-scm.com/docs/gitignore)。 请注意，`.eslintignore` 中的匹配规则比 `.gitignore` 中的更严格。

除了 `.eslintignore` 文件中的模式，ESLint总是忽略 `/node_modules/*` 和 `/bower_components/*` 中的文件。

```bash
# /node_modules/* 和 /bower_components/* 在项目根目录中默认忽略

# 忽略生成的文件，除了 build/index.js
build/*
!build/index.js
```

::: tip 提示

如果没有发现 `.eslintignore` 文件，也没有指定替代文件，ESLint 将在 package.json 文件中查找 `eslintIgnore` 键，来检查要忽略的文件。

:::
