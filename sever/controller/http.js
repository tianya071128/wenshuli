module.exports = {
  // 测试缓存
  cache({ res }) {
    res.setHeader("Cache-Control", "max-age=60");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("测试是否会缓存");
  },
  // 测试状态码
  status({ req, res, query, getHeader }) {
    console.log(getHeader('authorization'));
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
};
