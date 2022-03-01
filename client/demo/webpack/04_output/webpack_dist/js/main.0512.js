(self["myCustomFunc"] = self["myCustomFunc"] || []).push([["main"],[
/* 0 */,
/* 1 */
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _module_module01__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./module/module01 */ 2);


(0,_module_module01__WEBPACK_IMPORTED_MODULE_0__["default"])();

__webpack_require__.e(/*! import() */ "src_chunk_chunk01_js").then(__webpack_require__.bind(__webpack_require__, /*! ./chunk/chunk01 */ 0)).then(({ test }) => {
  test();
});


/***/ }),
/* 2 */
/*!********************************!*\
  !*** ./src/module/module01.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ test)
/* harmony export */ });
function test() {
  console.log('这是一个普通同步模块');
}

__webpack_require__.e(/*! import() */ "src_chunk_chunk01_js").then(__webpack_require__.bind(__webpack_require__, /*! ../chunk/chunk01 */ 0)).then(({ test }) => {
  test();
});


/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(1));
/******/ }
])