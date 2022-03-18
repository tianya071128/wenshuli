var babel = require('@babel/core');

babel
  .transformFileAsync(require('path').join(__dirname, './index.js'))
  .then((result) => {
    console.log(result.code);
  });
