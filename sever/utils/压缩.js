const compressing = require('compressing');

// 选择 gzip 格式，然后调用 compressFile 方法
compressing.gzip.compressFile('../assets/1.txt', '../assets/1.txt.gz')
  .then(() => {
    console.log('success');
  })
  .catch(err => {
    console.error(err);
  });

