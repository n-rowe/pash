// Based on https://github.com/unjs/ohash/blob/main/src/utils/diff.ts v2.0.0 (MIT)
import { serialize } from 'ohash'

export interface DiffOptions {
  /**
   * Function to determine if a key should be excluded from hashing.
   * @optional
   * @param key - The key to check for exclusion.
   * @returns {boolean} - Returns true to exclude the key from hashing.
   */
  excludeKeys?: ((key: string) => boolean) | undefined
}

interface DiffResult extends Array<DiffEntry> {
  asPatches: () => Operation[]
}

enum DiffType {
  primitive,
  array,
  object,
}

/**
 * Calculates the difference between two objects and returns a list of differences.
 *
 * @param {unknown} obj1 - The first object to compare.
 * @param {unknown} obj2 - The second object to compare.
 * @param {HashOptions} [opts] - Configuration options for hashing the objects. See {@link HashOptions}.
 * @returns {DiffResult} An array with the differences between the two objects.
 */
export function diff(
  obj1: unknown,
  obj2: unknown,
  opts: DiffOptions = {},
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
  opts: DiffOptions = {},
): DiffEntry[] {
  const isArray = h1.type === DiffType.array && h2.type === DiffType.array
  const isArrayElement = h1.parent?.type === DiffType.array && h2.parent?.type === DiffType.array

  const allProps = !isArrayElement
    ? new Set([
      ...h1.keys,
      ...h2.keys,
    ])
    : undefined

  const diffs: DiffEntry[] = []

  // Check object properties.
  // Array elements should be treated as a single value
  if (!isArrayElement && h1.props && h2.props) {
    let p1Offset = 0
    let p2Offset = 0
    const propArr = Array.from(allProps!)
    for (let i = 0; i < propArr.length - p2Offset; i++) {
      const prop = propArr[i] ?? i
      if (prop == null)
        continue

      const p1 = h1.props[isArray ? Number(prop) + p1Offset : prop]
      const p2 = h2.props[isArray ? Number(prop) + p2Offset : prop]
      const actualp2 = isArray && h2.contains(p2)
        ? h2.props[prop] ?? p2
        : p2

      if (p1 && p2) {
        const propDiffs = _diff(p1, p2, opts)
        if (isArray) {
          const elemOperation = propDiffs[0]?.op
          if (elemOperation === 'add') {
            if (p2.compare(actualp2)) {
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
        && (!h2.contains(p1))
        && (!h1.contains(p2))
      ) {
        diffs.push(
          new DiffEntry((p2 || p1)!.key, p1 ? 'remove' : 'add', p2, p1),
        )
      }
    }
  }

  // Check value hashes or element hashes.
  if ((allProps?.size === 0 || isArrayElement) && !h1.compare(h2)) {
    // Element still exists, so add.
    if (h2.parent?.contains(h1)) {
      diffs.push(new DiffEntry((h2 ?? h1).key, 'add', h2, h1))
    }
    // Element once existed, so remove.
    else if (h1.parent?.contains(h2)) {
      diffs.push(new DiffEntry((h2 ?? h1).key, 'remove', h2, h1))
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
  opts: DiffOptions = {},
  key: string = '',
  parent?: DiffHashedObject,
): DiffHashedObject {
  if (obj != null && typeof obj !== 'object') {
    return new DiffHashedObject(
      key,
      obj,
      serialize(obj),
      undefined,
      parent,
    )
  }

  // Create container element
  const props: Record<string, DiffHashedObject> = {}
  const container = new DiffHashedObject(key, obj, '', props)

  // Hash child props
  for (const _key in obj) {
    if (opts.excludeKeys?.(_key))
      continue

    const hashObj = _toHashedObject(obj[_key as keyof typeof obj], opts, `${key}/${_key}`, container)
    props[_key] = hashObj
    container.keys?.push(_key)
    container.hash += hashObj.hash
  }

  return container
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
    const jsonPath = `${this.path}`
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

class DiffHashedObject {
  #hashes: Set<string> | undefined
  public type: DiffType

  constructor(
    public key: string,
    public value: unknown,
    public hash: string,
    public props?: Record<string, DiffHashedObject>,
    public parent?: DiffHashedObject,
    public keys: string[] = [],
  ) {
    if (typeof value !== 'object') {
      this.type = DiffType.primitive
      return
    }

    if (Array.isArray(value))
      this.type = DiffType.array
    else
      this.type = DiffType.object
  }

  /**
   * Compares against a {@link DiffHashedObject}.
   */
  compare(o2?: DiffHashedObject): boolean {
    if (!o2)
      return false
    if (this.type !== o2.type)
      return false
    if (this.hash !== o2.hash)
      return false

    return true
  }

  /**
   * Determines if the provided hash exists in the object.
   * @param hash The hash to check for.
   * @returns If the hash is a member
   */
  contains(hash?: DiffHashedObject): boolean {
    // Quick checks
    if (!hash || !hash.hash)
      return false
    if (this.type !== DiffType.array)
      return false
    if (!this.props)
      return false
    if (this.#hashes && this.#hashes.size !== 0)
      return this.#hashes.has(hash.hash)

    // TODO: Adding elements to a set is the slowest thing.
    // Compute hashes
    let didFind = false
    this.#hashes = new Set()
    for (const key in this.props) {
      const prop = this.props[key]
      if (prop?.hash == null)
        continue

      didFind ||= prop.hash === hash.hash
      this.#hashes.add(prop.hash)
    }

    return didFind
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
}
