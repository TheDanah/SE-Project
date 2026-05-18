module.exports = [
  {
    ignores: ['node_modules', 'dist', 'build', '.env', '.env.local', '.github'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'indent': ['warn', 2],
      'linebreak-style': ['warn', 'unix'],
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
];
