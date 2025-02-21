import type { Operation } from 'fast-json-patch'
import { applyPatch, deepClone } from 'fast-json-patch'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { diff } from '../src'

const inputArr = [1, 2, 3, 4, 5]

describe.for([
  // Simple Arrays
  { input: inputArr, output: [1, 2, 'a', 3, 4, 5, 'b'], op: 'add,add' },
  { input: inputArr, output: [1, 2, 'a', 'b', 3, 4, 5, 'c'], op: 'add,add,add', count: 3 },
  { input: inputArr, output: [1, 2, 'a', 3, 5], op: 'add,remove' },
  { input: inputArr, output: [1, 2, 'a', 3, 'b', 5], op: 'add,replace' },
  { input: inputArr, output: [1, 3, 4, 5, 'a'], op: 'remove,add' },
  { input: inputArr, output: [1, 3, 5], op: 'remove,remove' },
  { input: inputArr, output: [1, 5], op: 'remove,remove, remove', count: 3 },
  { input: inputArr, output: [1, 3, 'a', 5], op: 'remove,replace' },
  { input: inputArr, output: [1, 'a', 3, 4, 'b', 5], op: 'replace,add' },
  { input: inputArr, output: [1, 'a', 3, 5], op: 'replace,remove' },
  { input: inputArr, output: [1, 'a', 3, 'b', 5], op: 'replace,replace' },
  { input: inputArr, output: [1, 'a', 'b', 'c', 5], op: 'replace,replace,replace', count: 3 },
])('$op - diff($input, $output)', ({ input, output, count }) => {
  const patches = diff(input, output)
  const operations = patches.asPatches()
  const patchError = `Invalid patch got: ${JSON.stringify(operations)}`

  it('creates correct patch', () => {
    expectTypeOf(patches).toBeArray()
    expect(patches.length, patchError).toBe(count ?? 2)
  })

  it('creates correct operations', () => {
    expect(operations.length, patchError).toBe(patches.length)
    expectTypeOf(operations).toMatchTypeOf<Operation[]>()
  })

  it('can be applied correctly', () => {
    const patched = applyPatch(deepClone(input), operations)
    expect(patched.newDocument, patchError).toEqual(output)
  })
})
