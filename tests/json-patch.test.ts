import { applyPatch, deepClone } from 'fast-json-patch'
import { describe, expect, it } from 'vitest'
import { diff } from '../src/index.js'
import tests from './tests.json'

const SUPPORTED_OPS = new Set([
  'add',
  'remove',
  'replace',
])

// Tests to forcibly skip
const SKIP_TESTS = new Set([
  // We don't use add to replace
  5,
  11,
  12,
  63,
  // We don't generate patches with the '/-' path
  13,
  64,
  65,
  // We don't use replace unnecessarily
  43,
  // FIX: Broken Tests
  32,
  34,
  35,
  42,
])

for (let i = 0; i < tests.length; i++) {
  const test = tests[i]
  let doSkip = SKIP_TESTS.has(i)

  // Only do patch tests
  if (test == null || test.expected == null || test.disabled) {
    doSkip = true
  }
  // Ignore unsupported operations
  else if (test.patch.some(x => !SUPPORTED_OPS.has(x.op))) {
    doSkip = true
  }

  describe.skipIf(doSkip)(`#${i} ${test?.comment ?? ''}`, () => {
    // test should exist
    if (test == null) {
      return
    }

    it(`creates correct patch`, () => {
      const patch = diff(test.doc, test.expected, { deep: true }).asRFC6902()
      expect(patch).toEqual(test.patch)
    })

    it(`creates same output when applied (deep)`, () => {
      const patch = diff(test.doc, test.expected, { deep: true }).asRFC6902()
      const out = applyPatch(deepClone(test.doc), patch)
      expect(out.newDocument).toEqual(test.expected)
    })
    it(`creates same output when applied (non-deep)`, () => {
      const patch = diff(test.doc, test.expected, { deep: false }).asRFC6902()
      const out = applyPatch(deepClone(test.doc), patch)
      expect(out.newDocument).toEqual(test.expected)
    })
  })
}
