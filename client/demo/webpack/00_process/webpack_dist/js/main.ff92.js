(self["webpackChunk"] = self["webpackChunk"] || []).push([["main"],{

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
/* harmony import */ var _module_module01__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./module/module01 */ "./src/module/module01.js");


__webpack_require__.e(/*! import() */ "src_chunk_chunk01_js").then(__webpack_require__.bind(__webpack_require__, /*! ./chunk/chunk01 */ "./src/chunk/chunk01.js")).then(({ chunk }) => chunk());

function exportTest() {}


/***/ }),

/***/ "./src/index02.js":
/*!************************!*\
  !*** ./src/index02.js ***!
  \************************/
/***/ (function() {

console.log('测试一下');


/***/ }),

/***/ "./src/module/module01.js":
/*!********************************!*\
  !*** ./src/module/module01.js ***!
  \********************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "test": function() { return /* binding */ test; },
/* harmony export */   "test2": function() { return /* binding */ test2; }
/* harmony export */ });
function test() {}

function test2() {}


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ var __webpack_exec__ = function(moduleId) { return __webpack_require__(__webpack_require__.s = moduleId); }
/******/ var __webpack_exports__ = (__webpack_exec__("./src/index02.js"), __webpack_exec__("./src/index.js"));
/******/ }
]);