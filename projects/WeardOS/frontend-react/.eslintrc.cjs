/**
 * ESLint configuration for React + TypeScript + Vite project
 * Root cause addressed: lint script failed due to missing ESLint config.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'react-refresh',
    'react-hooks',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // React 17+ no need for React in scope
    'react/react-in-jsx-scope': 'off',
    // Vite fast refresh
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // TS rules tuned for this codebase
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    // General hygiene
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
  },
  overrides: [
    {
      files: ['vite.config.ts'],
      parserOptions: {
        project: './tsconfig.node.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['**/*.scss', '**/*.css'],
      rules: {},
    },
  ],
};