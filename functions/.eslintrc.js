module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  ignorePatterns: [
    "/lib/**/*",
    "/node_modules/**/*",
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "max-len": ["error", { "code": 120 }],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-unused-vars": "warn",
  },
};