module.exports = {
  env: {
    commonjs: true,
    es2020: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-unused-vars': 1,
    'no-underscore-dangle': 0,
    'prefer-arrow-callback': 0,
    'no-new-object': 0,
    'no-array-constructor': 0,
  },
};
