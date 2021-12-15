//my-awesome-formatter.js
module.exports = function(results) {
  return JSON.stringify(results, null, 2);
};
