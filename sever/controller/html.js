const https = require("https");

module.exports = {
  async getImg({ res }) {
    const options = {
      hostname: "fanyi-cdn.cdn.bcebos.com",
      port: 443,
      path: "/static/translation/widget/footer/Products/img/product-desktop@2x_c85778a.png",
      method: "GET",
    };

    const req2 = https.request(options, (res2) => {
      const chunks = [];
      res2.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res2.on("end", () => {
        res.writeHead(200, {
          "content-type": res2.headers["content-type"],
          "content-length": res2.headers["content-length"],
        });
        res.end(Buffer.concat(chunks));
      });
    });

    req2.on("error", (e) => {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end();
    });
    req2.end();
  },
};
