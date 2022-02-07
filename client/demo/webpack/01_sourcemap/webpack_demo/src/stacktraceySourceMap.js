(async () => {
  const sourceMap = require('source-map');
  const SourceMapConsumer = sourceMap.SourceMapConsumer;
  const Stacktracey = require('stacktracey');

  const errorStack = `TypeError: Cannot read properties of undefined (reading 'c')
    at main.hidden-source-map.js:17337:22
    at main.hidden-source-map.js:17338:3
    at main.hidden-source-map.js:17340:12`; // 错误信息
  const sourceMapFileContent = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../dist_test/main.hidden-source-map.js.map'
    ),
    {
      encoding: 'utf-8',
    }
  ); // sourcemap文件内容

  const tracey = new Stacktracey(errorStack); // 解析错误信息
  const sourceMapContent = JSON.parse(sourceMapFileContent);
  const consumerP = new SourceMapConsumer(sourceMapContent);
  consumerP.then((consumer) => {
    for (const frame of tracey.items) {
      // 这里的frame就是stack中的一行所解析出来的内容
      // originalPosition不仅仅是行列信息，还有错误发生的文件 originalPosition.source
      const originalPosition = consumer.originalPositionFor({
        line: frame.line,
        column: frame.column,
      });
      // 错误所对应的源码
      if (originalPosition.source) {
        const sourceContent = consumer.sourceContentFor(
          originalPosition.source
        );
        console.log('列：', originalPosition.line);
        console.log('行：', originalPosition.column);
        console.log('源代码', sourceContent);
      }
    }
  });
})();
