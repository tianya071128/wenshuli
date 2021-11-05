const httpController = require("../controller/http");

const basePath = "/vuepress_test";
const routers = [
  {
    method: ["get", "post", "head", "delete"],
    path: "/http/cache",
    controller: httpController.cache,
  },
  {
    method: ["get"],
    path: "/http/status",
    controller: httpController.status,
  },
  {
    method: ["get"],
    path: "/http/encoding",
    controller: httpController.encoding,
  },
  {
    method: ["get"],
    path: "/http/pragma",
    controller: httpController.pragma,
  },
  {
    method: ["get", "post", "head", "delete"],
    path: "/http/cors",
    controller: httpController.cors,
  },
];
const conterollers = routers.reduce(function (total, item) {
  return {
    ...total,
    ...(Array.isArray(item.method) ? item.method : [item.method]).reduce(
      (total2, item2) => {
        return {
          ...total2,
          [`${basePath}${item.path}_${item2}`]: item.controller,
        };
      },
      {}
    ),
  };
}, {});

module.exports = async function staticMiddeware(ctx) {
  const ctx2 = { ...ctx };
  delete ctx2.res;
  delete ctx2.req;
  console.log(ctx2);

  const { path, method, res } = ctx;
  const processor = conterollers[path + "_" + method];
  if (processor) return processor(ctx);

  res.writeHead(404);
  res.end();
};
