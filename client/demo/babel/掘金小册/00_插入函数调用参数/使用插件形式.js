const { transformSync } = require('@babel/core');
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

const { code } = transformSync(sourceCode, {
  plugins: ['./plugin_demo.js'],
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  },
});

console.log(code);
