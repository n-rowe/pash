import type { Operation } from 'fast-json-patch'
import { applyPatch, deepClone } from 'fast-json-patch'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { diff } from '../src/index.ts'

const complexArr = { id: 1, items: [1, 2, 3] }
const complexObj = { id: 1, nested: { a: 1, b: 2, c: 3 } }

describe.for([
  // Nested Array
  { input: complexArr, output: { id: 1, items: [1, 2, 3, 4] }, op: 'add', change_key: 'items' },
  { input: complexArr, output: { id: 1, items: [1, 4, 2, 3] }, op: 'add', change_key: 'items' },
  { input: complexArr, output: { id: 1, items: [1, 2] }, op: 'remove', change_key: 'items' },
  { input: complexArr, output: { id: 1, items: [1, 3] }, op: 'remove', change_key: 'items' },
  { input: complexArr, output: { id: 1, items: [1, 2, 4] }, op: 'replace', change_key: 'items' },
  { input: complexArr, output: { id: 1, items: [1, 4, 3] }, op: 'replace', change_key: 'items' },
  // Nested Object
  { input: complexObj, output: { id: 1, nested: { a: 1, b: 2, c: 3, d: 4 } }, op: 'add', change_key: 'nested' },
  { input: complexObj, output: { id: 1, nested: { a: 1, d: 4, b: 2, c: 3 } }, op: 'add', change_key: 'nested' },
  { input: complexObj, output: { id: 1, nested: { a: 1, b: 2 } }, op: 'remove', change_key: 'nested' },
  { input: complexObj, output: { id: 1, nested: { a: 1, c: 3 } }, op: 'remove', change_key: 'nested' },
  { input: complexObj, output: { id: 1, nested: { a: 1, b: 2, c: 4 } }, op: 'replace', change_key: 'nested' },
  { input: complexObj, output: { id: 1, nested: { a: 1, b: 4, c: 3 } }, op: 'replace', change_key: 'nested' },
])('$op - diff($input, $output)', ({ input, output, op, change_key }) => {
  const patches = diff(input, output)
  const operations = patches.asPatches()
  const patchError = `Invalid patch got: ${JSON.stringify(operations)}`

  it('creates correct patch', () => {
    expectTypeOf(patches).toBeArray()

    const inputLength = typeof input === 'object' ? Object.keys(input[change_key as keyof typeof input]).length : null
    const outputLength = typeof output === 'object' ? Object.keys(output[change_key as keyof typeof input]).length : null
    if (inputLength != null && outputLength != null) {
      let length = 1
      switch (op) {
        case 'add':
          length = outputLength - inputLength
          break
        case 'remove':
          length = inputLength - outputLength
          break
        case 'replace':
          length = 1
          break
      }

      expect(patches.length, patchError).toBe(length)
    }
  })

  it('creates correct operations', () => {
    expect(operations.length).toBe(patches.length)
    expectTypeOf(operations).toExtend<Operation[]>()
  })

  it('can be applied correctly', () => {
    const patched = applyPatch(deepClone(input), operations)
    expect(patched.newDocument, patchError).toEqual(output)
  })
})
