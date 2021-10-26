module.exports = {
  // 测试缓存
  cache({ res }) {
    res.setHeader("Cache-Control", "max-age=60");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end('测试是否会缓存', 'utf8');
  }
}