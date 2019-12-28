module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended' // Uses the recommended rules from @typescript-eslint/eslint-plugin
  ],
  parserOptions: {
    ecmaVersion: 2018 // Allows for the parsing of modern ECMAScript features
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",

    // eslint rules - https://eslint.org/docs/rules/
    'arrow-parens': ['error', 'as-needed'],
    // 'valid-jsdoc': 'error',
    'no-console': 'error',
    'no-extra-semi': 'error',
    'semi': ['error', 'always'],
    'no-unreachable': 'error',
    'default-case': 'error',
    'no-shadow': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', 140],
    'indent': ['error', 2, {
      'SwitchCase': 1,
      'flatTernaryExpressions': true
    }],

    // eslint ts rules - https://github.com/bradzacher/eslint-plugin-typescript
    '@typescript-eslint/typedef': ['error', {
      'arrayDestructuring': true,
      'arrowParameter': true,
      'memberVariableDeclaration': true,
      'objectDestructuring': true,
      'parameter': true,
      'propertyDeclaration': true,
      'variableDeclaration': true
    }],
    '@typescript-eslint/quotes': ['error', 'single'],
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/interface-name-prefix': ['error', 'always'],
    '@typescript-eslint/member-ordering': ['error', {classes: ['constructor', 'private-instance-method', 'public-instance-method']}],
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-function': 'off'
  }
};
