const httpController = require('../controller/http');
const htmlController = require('../controller/html');

const routers = [
  {
    method: ['get', 'post', 'head', 'delete'],
    path: '/http/cache',
    controller: httpController.cache,
  },
  {
    method: ['get'],
    path: '/http/status',
    controller: httpController.status,
  },
  {
    method: ['get'],
    path: '/http/encoding',
    controller: httpController.encoding,
  },
  {
    method: ['get'],
    path: '/http/pragma',
    controller: httpController.pragma,
  },
  {
    method: ['get', 'post', 'head', 'delete', 'put', 'options'],
    path: '/http/cors',
    controller: httpController.cors,
  },
  {
    method: ['get'],
    path: '/http/corsCookie',
    controller: httpController.corsCookie,
  },
  {
    method: ['get'],
    path: '/html/getImg',
    controller: htmlController.getImg,
  },
  {
    method: ['get'],
    path: '/html/formElement',
    controller: htmlController.formElement,
  },
  {
    method: ['get'],
    path: '/html/scriptCors',
    controller: htmlController.scriptCors,
  },
  {
    method: ['post'],
    path: '/html/xhr',
    controller: htmlController.xhr,
  },
];
const conterollers = routers.reduce(function (total, item) {
  return {
    ...total,
    ...(Array.isArray(item.method) ? item.method : [item.method]).reduce(
      (total2, item2) => {
        return {
          ...total2,
          [`${item.path}_${item2}`]: item.controller,
        };
      },
      {}
    ),
  };
}, {});

module.exports = async function staticMiddeware(ctx) {
  const { path, method, res } = ctx;
  const processor = conterollers[path + '_' + method];
  if (processor) return processor(ctx);

  res.writeHead(404);
  res.end();
};
