/**
 * demo：插入函数调用参数
 */
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const template = require('@babel/template');

const sourceCode = `
    console.log(1);

    function func() {
        console.info(2);
    }

    export default class Clazz {
        say() {
            console.debug(3);
        }
        render() {
            return <div>{console.error(4)}</div>
        }
    }
`;

// 1. 获取到 ast
const ast = parser.parse(sourceCode, {
  sourceType: 'unambiguous',
  plugins: ['jsx'],
});

// 2. 遍历 ast，调用注册的节点事件，会直接改变 ast 值
const targetCalleeName = ['log', 'info', 'error', 'debug'].map(
  (item) => `console.${item}`
);
traverse(ast, {
  CallExpression(path, state) {
    if (path.node.isNew) return;

    const calleeName = generate(path.node.callee).code;
    if (targetCalleeName.includes(calleeName)) {
      const { line, column } = path.node.loc.start;
      const newNode = template.expression(
        `console.log("filename: (${line}, ${column})")`
      )();
      newNode.isNew = true; // 打上标识，表示不要做处理了

      // 判断是否为 JSX 代码
      if (path.findParent((path) => path.isJSXElement())) {
        path.replaceWith(types.arrayExpression([newNode, path.node]));
        path.skip(); // 跳过子节点处理
      } else {
        path.insertBefore(newNode);
      }
    }
  },
});

// 3. 根据 ast 生成源码
const { code, map } = generate(ast);

console.log(code);
