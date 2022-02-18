module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2020: true,
  },
  // 使用 eslint-plugin-vue 中 essential 配置 and eslint 默认 recommended 配置
  extends: ['eslint:recommended'],
  rules: {},
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
};
