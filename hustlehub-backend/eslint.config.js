// Static analysis for the API: ESLint's recommended rules plus eslint-plugin-security, which flags risky patterns
// (unsafe regular expressions, eval, object injection, child processes, unsafe random numbers and so on).
// "npm run lint" must finish with zero errors and zero warnings: the pipeline fails otherwise.

const js = require('@eslint/js');
const globals = require('globals');
const security = require('eslint-plugin-security');

module.exports = [
  { ignores: ['node_modules/**', 'newman/reports/**', 'logs/**', 'certs/**', 'coverage/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    // Test code builds file paths and keys itself and never handles requests, so these two rules only add noise there.
    files: ['tests/**'],
    rules: { 'security/detect-object-injection': 'off', 'security/detect-non-literal-fs-filename': 'off' },
  },
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
