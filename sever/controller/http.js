const fs = require('fs').promises;
const path = require('path');

module.exports = {
  // 测试缓存
  cache({ res }) {
    res.setHeader("Cache-Control", "max-age=60");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("测试是否会缓存");
  },
  // 测试状态码
  status({ res, query, getHeader }) {
    if (getHeader('authorization')) {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end("状态码");
      return;
    }
    if (query.status == "301" || query.status == "302") {
      res.setHeader('Location', 'https://www.baidu.com/')
    }
    if (query.status == "401") {
      res.setHeader('WWW-Authenticate', 'Basic realm="Usagidesign Auth"')
    }
    res.writeHead(parseInt(query.status), {
      "Content-Type": "text/plain; charset=utf-8",
      
    });
    res.end("状态码");
  },
  // 测试内容编码
  async encoding({ res }) {
    const data = await fs.readFile(path.join(__dirname, '../assets/1.txt.gz'));

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Encoding": "gzip"
    });
    res.end(data);
  }
};
