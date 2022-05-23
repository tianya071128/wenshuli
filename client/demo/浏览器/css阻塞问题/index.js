// 1、加载模块
const http = require('http');
const fs = require('fs');
// 2、创建http
var server = http.createServer(); // 创建一个web容器 静态服务器
// 3、监听请求事件
server.on('request', function(req, res) {
  if (req.url.includes('theme.css')) {
    fs.readFile('./theme.css', (err, data) => {
      setTimeout(() => {
        res.setHeader('Content-Type', 'text/css');
        res.write(data);
        res.end();
      }, 3000);
    });
  } else {
    fs.readFile('./index.html', (err, data) => {
      res.setHeader('Content-Type', 'text/html;charset=utf-8');
      res.write(data);
      res.end();
    });
  }
});
// 4、监听端口，开启服务
server.listen(4000, function() {
  console.log('服务器已经启动，可访问以下地址：');
  console.log('http://localhost:4000');
});
