(self["webpackChunk"] = self["webpackChunk"] || []).push([["main"],{

/***/ "../node_modules/babel-loader/lib/index.js!./src/module/module01.js":
/*!**************************************************************************!*\
  !*** ../node_modules/babel-loader/lib/index.js!./src/module/module01.js ***!
  \**************************************************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "test": function() { return /* binding */ test; },
/* harmony export */   "test2": function() { return /* binding */ test2; }
/* harmony export */ });
function test() {}
function test2() {}

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "exportTest": function() { return /* binding */ exportTest; }
/* harmony export */ });
/* harmony import */ var babel_loader_module_module01__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babel-loader!./module/module01 */ "../node_modules/babel-loader/lib/index.js!./src/module/module01.js");
/* harmony import */ var _module_module02__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./module/module02 */ "./src/module/module02.js");
/* harmony import */ var _module_module02__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_module_module02__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _img_01_png__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./img/01.png */ "./src/img/01.png");
/* harmony import */ var _img_01_png__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_img_01_png__WEBPACK_IMPORTED_MODULE_2__);



console.log('全流程构建', babel_loader_module_module01__WEBPACK_IMPORTED_MODULE_0__.test, (_img_01_png__WEBPACK_IMPORTED_MODULE_2___default()));

__webpack_require__.e(/*! import() */ "src_chunk_chunk01_js").then(__webpack_require__.bind(__webpack_require__, /*! ./chunk/chunk01 */ "./src/chunk/chunk01.js")).then(({ chunk }) => {
  chunk();
});

function exportTest() {
  console.log('导出一个模块试试');
}


/***/ }),

/***/ "./src/module/module02.js":
/*!********************************!*\
  !*** ./src/module/module02.js ***!
  \********************************/
/***/ (function() {

console.log('./module02.js');


/***/ }),

/***/ "./src/img/01.png":
/*!************************!*\
  !*** ./src/img/01.png ***!
  \************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.p + "48bd36ea4fc5ea87bfe5bc4fa3bf05b2.png";

/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ var __webpack_exec__ = function(moduleId) { return __webpack_require__(__webpack_require__.s = moduleId); }
/******/ var __webpack_exports__ = (__webpack_exec__("./src/index.js"));
/******/ }
]);