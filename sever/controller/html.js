const https = require('https');
const { readFile } = require('fs').promises;
const path = require('path');

module.exports = {
  async getImg({ res }) {
    const options = {
      hostname: 'fanyi-cdn.cdn.bcebos.com',
      port: 443,
      path: '/static/translation/widget/footer/Products/img/product-desktop@2x_c85778a.png',
      method: 'GET',
    };

    const req2 = https.request(options, (res2) => {
      const chunks = [];
      res2.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res2.on('end', () => {
        res.writeHead(200, {
          'content-type': res2.headers['content-type'],
          'content-length': res2.headers['content-length'],
        });
        res.end(Buffer.concat(chunks));
      });
    });

    req2.on('error', (e) => {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end();
    });
    req2.end();
  },
  async formElement({ res, query }) {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(
      `请求参数：${JSON.stringify(
        query
      )} => 服务端做了处理，才会显示出数组。观察 URL 可知，复选框是通过多个 name 传递的`
    );
  },
  async scriptCors({ query, res }) {
    const fileData = await readFile(path.join(__dirname, '../public/01.js'));
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (query.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.end(fileData);
  },
  async xhr({ res, file }) {
    const fileData = await readFile(file[0]);
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Content-Type', 'application/octet-stream');

    res.end(fileData);
  },
};
