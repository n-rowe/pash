import codspeedPlugin from '@codspeed/vitest-plugin'
import { isCI } from 'std-env'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [isCI && codspeedPlugin()],
  test: {
    dir: './tests',
    coverage: {
      provider: 'v8',
      exclude: [...configDefaults.coverage.exclude!, 'docs/**/*'],
    },
    typecheck: {
      include: ['*.test.ts'],
    },
  },
})
