// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'famora',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'famora',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // Supabase schema types must be type aliases, not interfaces: postgrest-js constrains every
    // table to Record<string, unknown>, and an interface cannot satisfy that because declaration
    // merging blocks the index signature. With interfaces, every query resolves to `never`.
    // Kept here rather than inline so it survives regenerating the file via `supabase gen types`.
    files: ['src/app/lib/database.types.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
