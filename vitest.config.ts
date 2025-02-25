import codspeedPlugin from '@codspeed/vitest-plugin'
import { isCI } from 'std-env'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [isCI && codspeedPlugin()],
  test: {
    dir: './tests',
    coverage: {
      provider: 'v8',
    },
    typecheck: {
      include: ['*.test.ts'],
    },
  },
})
