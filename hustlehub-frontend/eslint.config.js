// Static analysis for the React app: ESLint recommended rules, the React Hooks rules and eslint-plugin-security.
// The pipeline runs "npm run lint" and fails on any error or warning.

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  security.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^(_|[A-Z])', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // Test files and the Vite config run in Node / the test runner.
    files: ['**/*.test.{js,jsx}', 'src/test/**', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.vitest } },
  },
];
