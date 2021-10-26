const http = require("http");
const baseMiddleware = require("./middleware/baseMiddleware");
const bodyMiddleware = require("./middleware/bodyMiddleware");
// const staticMiddeware = require("./middleware/staticMiddeware");
const router = require('./router/index');

http
  .createServer(async function (req, res) {
    const ctx = {
      req,
      res,
    };
    await baseMiddleware(ctx); // 基础处理

    await bodyMiddleware(ctx); // post - 请求体处理


    router(ctx);
  })
  .listen(5000, () => console.log("启动成功"));