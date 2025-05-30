// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  globals: {
    WebflowApps: 'readonly',
    axios: 'readonly',
    cheerio: 'readonly',
    escapeHTML: 'writable',
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    'no-console': 'warn',
  },
};