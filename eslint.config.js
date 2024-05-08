import antfu from '@antfu/eslint-config'
import tailwind from '@kalimahapps/eslint-plugin-tailwind'

export default antfu({
  ignores: [
    '**/playwright-report/',
    '**/test-results/',
    '**/dist/',
    '.dictionaries/',
    '**/.vite-ssg-temp/',
    '**/.wrangler/',
  ],
}, {
  plugins: {
    tailwind,
  },
  rules: {
    'tailwind/sort': 'error',
    'tailwind/multiline': ['error', {
      maxLen: 10,
    }],
    'vue/max-attributes-per-line': ['error', {
      singleline: 1,
      multiline: 1,
    }],
    'vue/array-bracket-newline': ['error', 'consistent'],
    'vue/array-element-newline': ['error', 'consistent'],
    'vue/object-curly-newline': ['error', { consistent: true }],
    'vue/object-property-newline': ['error', {
      allowAllPropertiesOnSameLine: true,
    }],
    'vue/no-v-text-v-html-on-component': 'off',

    'vue/singleline-html-element-content-newline': ['error', {
      ignoreWhenNoAttributes: false,
      ignoreWhenEmpty: false,
    }],
    'vue/multiline-html-element-content-newline': ['error'],
    'vue/first-attribute-linebreak': ['error', {
      singleline: 'beside',
      multiline: 'below',
    }],

    'no-console': 'off',
    'node/prefer-global/process': 'off',
    'ts/consistent-type-definitions': 'off',
  },
})
