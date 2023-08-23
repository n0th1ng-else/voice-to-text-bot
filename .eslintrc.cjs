module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    es6: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    "no-mixed-spaces-and-tabs": "off",
    "@typescript-eslint/no-var-requires": "off",
    "no-console": "error",
    "@typescript-eslint/prefer-namespace-keyword": "off",
    "@typescript-eslint/no-namespace": "warn",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-floating-promises": "error",
  },
};
