import type { Operation } from 'fast-json-patch'
import { applyPatch, deepClone } from 'fast-json-patch'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { diff } from '../src/index.ts'

const inputArr = [1, 2, 3, 4]
const complexInputArr = [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 4 }]

const inputObj = { a: 1, b: 2, c: 3, d: 4 }

describe.for([
  // Simple Arrays
  { input: inputArr, output: [1, 2, 3, 4, 5], op: 'add' },
  { input: inputArr, output: [1, 5, 2, 3, 4], op: 'add' },
  { input: inputArr, output: [1, 2, 3], op: 'remove' },
  { input: inputArr, output: [1, 3, 4], op: 'remove' },
  { input: inputArr, output: [1, 3], op: 'remove' },
  { input: inputArr, output: [1, 2, 3, 5], op: 'replace' },
  { input: inputArr, output: [1, 5, 3, 4], op: 'replace' },
  // Simple Objects
  { input: inputObj, output: { a: 1, b: 2, c: 3, d: 4, e: 5 }, op: 'add' },
  { input: inputObj, output: { a: 1, e: 5, b: 2, c: 3, d: 4 }, op: 'add' },
  { input: inputObj, output: { a: 1, b: 2, c: 3 }, op: 'remove' },
  { input: inputObj, output: { a: 1, c: 3, d: 4 }, op: 'remove' },
  { input: inputObj, output: { a: 1, c: 3 }, op: 'remove' },
  { input: inputObj, output: { a: 1, b: 2, c: 3, d: 5 }, op: 'replace' },
  { input: inputObj, output: { a: 1, b: 5, c: 3, d: 4 }, op: 'replace' },
  // Complex Arrays
  { input: complexInputArr, output: [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 4 }, { key: 5 }], op: 'add' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 5 }, { key: 2 }, { key: 3 }, { key: 4 }], op: 'add' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 2 }, { key: 3 }], op: 'remove' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 3 }, { key: 4 }], op: 'remove' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 3 }], op: 'remove' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 5 }], op: 'replace' },
  { input: complexInputArr, output: [{ key: 1 }, { key: 5 }, { key: 3 }, { key: 4 }], op: 'replace' },
])('$op - diff($input, $output)', ({ input, output, op }) => {
  const patches = diff(input, output)
  const operations = patches.asPatches()
  const patchError = `Invalid patch got: ${JSON.stringify(operations)}`

  it('creates correct patch', () => {
    expectTypeOf(patches).toBeArray()

    const inputLength = typeof input === 'object' ? Object.keys(input).length : null
    const outputLength = typeof output === 'object' ? Object.keys(output).length : null
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
