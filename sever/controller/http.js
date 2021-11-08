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
  },
  // 测试 pragma 缓存 and 优先级
  async pragma({ res }) {
    res.setHeader("Cache-Control", "max-age=60");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("hello words");
  },
  // 测试跨域
  async cors({res}) {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": '*',
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Allow-Methods": "PUT, POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Max-Age": 60 * 1000
    });

    res.end("跨域请求");
  },
  corsCookie({ res, getHeader }) {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": getHeader('Origin'),
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Allow-Methods": "PUT, POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Credentials": true,
    });

    res.end("跨域请求");
  }
};
