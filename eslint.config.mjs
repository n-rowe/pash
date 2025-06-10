// @ts-check
import antfu from '@antfu/eslint-config'

// Investigate moving to oxlint when stable / plugins are supported
// https://github.com/oxc-project/oxc
export default antfu({
  ignores: ['tests/tests.json'],

  // https://eslint.style/rules
  stylistic: {
    overrides: {
      'style/function-paren-newline': ['error', 'consistent'],
    },
  },

  // https://typescript-eslint.io/rules/
  typescript: {
    tsconfigPath: 'tsconfig.json',
    overrides: {
      'ts/no-explicit-any': ['error'],
      'ts/prefer-literal-enum-member': ['error', {
        allowBitwiseExpressions: true,
      }],
    },
  },

  yaml: {
    overrides: {
      '@stylistic/spaced-comment': ['off'],
    },
  },
})
