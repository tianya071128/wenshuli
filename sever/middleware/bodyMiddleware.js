const path = require('path');
const { cwd } = require('process');
const { URLSearchParams } = require('url');

module.exports = function bodyMiddleware(ctx) {
  const { req, res, method } = ctx;
  const contentType = (req.headers['content-type'] || '').split(';')[0];

  if (method === 'post') {
    // 先处理 post 请求先 -- 任何请求都可以通过 body 传参, 虽然不规范
    return new Promise((resolve, reject) => {
      let chunks = [];
      let size = 0;
      let isError = false;
      // req 请求体就是一个流, 会接收返回的数据
      req.on('data', (chunk) => {
        if (isError) return;
        chunks.push(chunk); // 将所有的 chunk 存储到 chunks 中
        size += chunk.length;
        if (size > 100 * 1024 * 1024) {
          isError = true;
        }
      });
      req.on('end', () => {
        if (isError) {
          res.writeHead(413, {
            'Content-Type': 'text/plain; charset=utf-8',
          });
          res.end('文件不能超过 100MB');
          return;
        }
        const buf = Buffer.concat(chunks, size);
        if (size === 0) {
          resolve();
          return;
        }
        if (contentType === 'application/x-www-form-urlencoded') {
          // 表单数据, 不包含文件情况下
          // 处理一下
          const params = buf.toString('utf8');
          ctx.params = {};
          new URLSearchParams(params).forEach((value, name) => {
            if (ctx.params.hasOwnProperty(name)) {
              // 如果存在多个, 生成数组
              ctx.params[name] = Array.isArray(ctx.params[name])
                ? ctx.params[name].push(value)
                : [ctx.params[name], value];
            } else {
              ctx.params[name] = value;
            }
          });
        } else if (contentType === 'application/json') {
          // json 数据解析
          // 处理一下
          const params = buf.toString('utf8');
          ctx.params = JSON.parse(params || '{}') || {};
        } else if (contentType === 'multipart/form-data') {
          // 文件上传
          const delimiter =
            '--' +
            (req.headers['content-type'] || '').split(';')[1].split('=')[1]; // content-type 请求头中包含着分隔符, 并且需要在前面添加 --
          let dataBuffer = buf; // buf 数据
          let resBuffer = [];
          let i = 0;
          let fileDir = path.normalize(path.join(cwd(), 'assets/temp/'));
          let allP = [];
          // 利用分隔符对数据进行分隔
          while ((i = dataBuffer.indexOf(delimiter)) > -1) {
            resBuffer.push(dataBuffer.slice(0, i));
            // 将分隔符后面的内部提取出来
            dataBuffer = dataBuffer.slice(i + delimiter.length);
          }
          // 第一个是无效数据
          resBuffer.shift();
          ctx.params = {};
          // 处理数据
          resBuffer.forEach((item) => {
            let buffer = item.slice(2, item.length - 2);
            let index = buffer.indexOf('\r\n\r\n');
            let info = buffer.slice(0, index).toString();
            let data = buffer.slice(index + 4);

            // 普通数据只有一行(以 \r\n 分隔)
            if (info.includes('\r\n')) {
              // 文件数据
              let filename = info.split('\r\n')[0].split('filename=')[1];
              filename = filename.substring(1, filename.length - 1);

              allP.push(
                new Promise((resolve, reject) => {
                  require('fs').writeFile(fileDir + filename, data, (err) => {
                    if (err) {
                      reject(err);
                    } else {
                      ctx.file = (ctx.file || []).concat(fileDir + filename);
                      resolve();
                      // 一分钟后删除文件
                      setTimeout(() => {
                        require('fs').unlink(fileDir + filename, (err) => {
                          console.log(err);
                        });
                      }, 1000 * 60);
                    }
                  });
                })
              );
            } else {
              // 普通数据
              let name = info.split('name=')[1];
              name = name.substring(1, name.length - 1);
              ctx.params[name] = data.toString();
            }
          });
          resolve(Promise.all(allP));
          return;
        }

        resolve();
      });
    });
  } else {
    return Promise.resolve();
  }
};
