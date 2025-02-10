/**
 * This is a modified version of
 * https://github.com/unjs/ohash/blob/main/src/utils/diff.ts
 *
 * In order to improve array diffing, by reducing the amount of
 * patches created.
 *
 * Changes:
 * 1. It stores the type of hashed objects.
 * 2. If an object is an array, it stores hashes of its direct children.
 * 3. If an object is an array element, do not diff properties.
 *   3.1 An array element only diffs its own hash.
 *   3.2 This means if it is an object, it will not replace individual properties.
 * 4. The patches generated have additional non-standard 'value' and 'from' properties for auditing.
 */

// TODO: Was there an issue when removing a bunch of records? and adding some?
//       Can't recreate

import type { diff as _odiff } from 'ohash'
import { objectHash } from 'ohash'

type _HashOptions = NonNullable<Parameters<typeof _odiff>['2']>
export interface HashOptions extends _HashOptions {

}

type DiffResult = Array<DiffEntry> & { asPatches: () => Operation[] }

/**
 * Calculates the difference between two objects and returns a list of differences.
 *
 * @param {unknown} obj1 - The first object to compare.
 * @param {unknown} obj2 - The second object to compare.
 * @param {HashOptions} [opts] - Configuration options for hashing the objects. See {@link HashOptions}.
 * @returns {DiffEntry[]} An array with the differences between the two objects.
 */
export function jsonDiff(
  obj1: unknown,
  obj2: unknown,
  opts: HashOptions = {},
): DiffResult {
  const h1 = _toHashedObject(obj1, opts)
  const h2 = _toHashedObject(obj2, opts)
  const diffs = _diff(h1, h2, opts)
  return Object.assign(diffs, {
    asPatches() {
      return diffs.map(diff => diff.toPatch())
    },
  })
}

function _diff(
  h1: DiffHashedObject,
  h2: DiffHashedObject,
  opts: HashOptions = {},
): DiffEntry[] {
  const isArray = h1.type === 'array' && h2.type === 'array'
  const isArrayElement = h1.parent?.type === 'array' && h2.parent?.type === 'array'

  const h1Keys = Object.keys(h1.props || {})
  const h2Keys = Object.keys(h2.props || {})
  const allProps = new Set([
    ...h1Keys,
    ...h2Keys,
  ])

  const diffs = []

  // Check object properties.
  // Array elements should be treated as a single value
  if (!isArrayElement && h1.props && h2.props) {
    let p1Offset = 0
    let p2Offset = 0
    const propArr = Array.from(allProps)
    for (let i = 0; i < propArr.length - p2Offset; i++) {
      const prop = propArr[i] ?? i
      if (prop == null)
        continue

      const p1 = h1.props[isArray ? Number(prop) + p1Offset : prop]
      const p2 = h2.props[isArray ? Number(prop) + p2Offset : prop]
      const actualp2 = isArray && p2?.hash != null && h2.hasHash(p2?.hash).success
        ? h2.props[prop] ?? p2
        : p2

      if (p1 && p2) {
        const propDiffs = _diff(p1, p2, opts)
        if (isArray) {
          const elemOperation = propDiffs[0]?.op
          if (elemOperation === 'add') {
            if (p2.hash === actualp2?.hash) {
              p1Offset--
            }
            else {
              p2Offset++
            }
          }
          else if (elemOperation === 'remove') {
            p2Offset--
          }
        }

        diffs.push(...propDiffs)
      }
      else if (
        (p1 || p2)
        && (p1?.hash == null || !h2.hasHash(p1?.hash).success)
        && (p2?.hash == null || !h1.hasHash(p2.hash).success)
      ) {
        diffs.push(
          new DiffEntry((p2 || p1)!.key, p1 ? 'remove' : 'add', p2, p1),
        )
      }
    }
  }

  // Check value hashes or element hashes.
  if ((allProps.size === 0 || isArrayElement) && h1.hash !== h2.hash) {
    const previousHash = h2.hash != null ? h1?.hasHash(h2.hash) : undefined
    const nextHash = h1.hash != null ? h2?.hasHash(h1.hash) : undefined

    // Element once existed, so remove.
    if (previousHash?.success && !nextHash?.success) {
      diffs.push(new DiffEntry((h2 ?? h1).key, 'remove', h2, h1))
    }
    // Element still exists, so add.
    else if (nextHash?.success) {
      diffs.push(new DiffEntry((h2 ?? h1).key, 'add', h2, h1))
    }
    // Element did not exist, so replace.
    else {
      diffs.push(new DiffEntry((h2 ?? h1).key, 'replace', h2, h1))
    }
  }

  return diffs
}

function _toHashedObject(
  obj: unknown,
  opts: HashOptions,
  key = '',
): DiffHashedObject {
  if (obj != null && typeof obj !== 'object') {
    return new DiffHashedObject(key, obj, objectHash(obj, opts), 'primitive')
  }

  const isArray = Array.isArray(obj)
  const props: Record<string, DiffHashedObject> = {}
  const hashes = []
  for (const _key in obj) {
    if (opts.excludeKeys?.(_key))
      continue

    props[_key] = _toHashedObject(
      obj?.[_key as keyof typeof obj],
      opts,
      key ? `${key}/${_key}` : _key,
    )
    hashes.push(props[_key].hash)
  }

  return new DiffHashedObject(
    key,
    obj,
    `{${hashes.sort().join(':')}}`,
    isArray ? 'array' : 'object',
    props,
  )
}

// --- Internal classes ---

interface BaseOperation<T extends string> {
  op: T
  path: string
}

interface AddOperation extends BaseOperation<'add'> {
  /**
   * The value to add.
   */
  value: unknown
}
interface RemoveOperation extends BaseOperation<'remove'> {
  /**
   * The value that was removed.
   * Modification on RFC 6902 to audit old changes.
   */
  value: unknown
}
interface ReplaceOperation extends BaseOperation<'replace'> {
  /**
   * The value to replace with.
   */
  value: unknown
  /**
   * The old value to be replaced.
   * Modification on RFC 6902 for change auditing.
   */
  from: unknown
}

type Operation = AddOperation | RemoveOperation | ReplaceOperation
type PatchOps = Operation['op']

class DiffEntry {
  constructor(
    public path: string,
    public op: PatchOps,
    public newValue?: DiffHashedObject,
    public oldValue?: DiffHashedObject,
  ) { }

  /**
   * Converts the diff entry to a JSON Patch.
   * RFC 6902.
   */
  toPatch(): Operation {
    const jsonPath = `/${this.path}`
    switch (this.op) {
      case 'add': {
        return {
          op: 'add',
          path: jsonPath,
          value: this.newValue?.value,
        }
      }
      case 'remove': {
        return {
          op: 'remove',
          path: jsonPath,
          value: this.oldValue?.value,
        }
      }
      case 'replace': {
        return {
          op: 'replace',
          path: jsonPath,
          value: this.newValue?.value,
          from: this.oldValue?.value,
        }
      }
    }
  }

  toString() {
    return this.toJSON()
  }

  toJSON() {
    switch (this.op) {
      case 'add': {
        return `Added   \`${this.path}\``
      }
      case 'remove': {
        return `Removed \`${this.path}\``
      }
      case 'replace': {
        return `Changed \`${this.path}\` from \`${this.oldValue?.toString() ?? '-'
        }\` to \`${this.newValue?.toString()}\``
      }
    }
  }
}

interface HashSearchResult {
  success: boolean
  object: DiffHashedObject
}

class DiffHashedObject {
  private hashes: Set<string> = new Set()

  constructor(
    public key: string,
    public value: unknown,
    public hash?: string,
    public type?: 'primitive' | 'array' | 'object',
    public props?: Record<string, DiffHashedObject>,
    public parent?: DiffHashedObject,
  ) {
    if (hash != null)
      this.hashes.add(hash)

    if (props != null && type === 'array') {
      for (const prop in props) {
        const propHash = props[prop]
        if (!propHash)
          continue

        if (propHash.hash != null)
          this.hashes.add(propHash.hash)
        propHash.parent = this
      }
    }
  }

  toString() {
    if (this.props) {
      return `{${Object.keys(this.props).join(',')}}`
    }
    else {
      return JSON.stringify(this.value)
    }
  }

  toJSON() {
    const k = this.key || '/'
    if (this.props) {
      return `${k}({${Object.keys(this.props).join(',')}})`
    }
    return `${k}(${this.value as string})`
  }

  hasHash(hash: string): HashSearchResult {
    if (this.hashes.has(hash))
      return { success: true, object: this }

    if (!this.parent)
      return { success: false, object: this }

    return this.parent.hasHash(hash)
  }
}
