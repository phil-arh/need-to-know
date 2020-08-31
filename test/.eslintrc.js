const process = require('process');

module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
    mocha: true,
  },
  plugins: [
    'mocha',
  ],
  extends: [
    'airbnb-base',
    'plugin:mocha/recommended',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // IMO 4 spaces is a lot more readable than 2
    'max-len': [1, 80],
    // Mocha prefers `function` functions to access `this`
    'prefer-arrow-callback': 0,
    'func-names': 0,
    // Chai uses 'unused' expressions quite a lot
    'no-unused-expressions': 0,
    'mocha/no-sibling-hooks': 0,
    'global-require': 0,
    'no-unused-vars': 1,
    'no-param-reassign': 0,
  },
};
