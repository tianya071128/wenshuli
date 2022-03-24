const generate = require('@babel/generator').default;
const targetCalleeName = ['log', 'info', 'error', 'debug'].map(
  (item) => `console.${item}`
);

module.exports = function({ types, template }) {
  return {
    visitor: {
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
    },
  };
};
