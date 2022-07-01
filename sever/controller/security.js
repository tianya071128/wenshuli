const template = require('art-template');

module.exports = {
  xss({ res, query }) {
    const html = template(
      require('path').join(__dirname, '../template/tpl-user.art'),
      {
        xss: query.xss,
        title: '反射型 XSS',
      }
    );
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
    });
    res.end(html);
  },
};
