/*
 * IMPORTANT!
 * This file has been automatically generated,
 * in order to update its content execute "npm run update"
 */
// 基础配置项
module.exports = {
  // 使用的解析器
  parser: require.resolve('vue-eslint-parser'),
  // 解析器选项，传递给解析器用于生成 AST
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  // 使用预定义的全局变量
  env: {
    browser: true, // 浏览器环境中的全局变量。
    es6: true, // 
  },
  // 定义使用的插件，这样就可以使用插件暴露的自定义规则
  plugins: ['vue'],
  // 规则集
  rules: {
    'vue/comment-directive': 'error',
    'vue/jsx-uses-vars': 'error',
    'vue/script-setup-uses-vars': 'error'
  }
}
