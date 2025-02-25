import codspeedPlugin from '@codspeed/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [codspeedPlugin()],
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
