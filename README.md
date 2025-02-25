# Pash
<p>
<img src="https://img.shields.io/github/actions/workflow/status/n-rowe/pash/ci.yaml">
<img src="https://img.shields.io/codecov/c/github/n-rowe/pash" />
<img src="https://img.shields.io/github/license/n-rowe/pash?cacheSeconds=60480">
</p>

A fast, minimal json patch generation library based off [ohash](https://github.com/unjs/ohash)'s implementation.

## Motivations
The current implementation of libraries such as `fast-json-patch` or `ohash` will create additional diff entries for array elements. Which can, in some cases, defeat the simplicity of JSON Patch.
To resolve this a number of changes were made on top of ohash's diff implementation:
1. It stores the type of hashed objects.
2. If an object is an array, it stores hashes of its direct children.
3. If an object is an array element, do not diff properties.
    1. An array element only diffs its own hash.
    2. This means if it is an object, it will not replace individual properties.
4. The patches generated have additional non-standard 'value' and 'from' properties for auditing.
5. Adds support for the `excludeKeys` hashing option.

## Usage

### 1. Basic usage
Below is the basic usage of pash.
```js
import { diff } from '@n-rowe/pash'

const source = { name: 'Graham', roles: ['Admin', 'User', 'Owner'] }
const changed = { name: 'Graham', roles: ['Admin', 'Owner'] }

const patches = diff(source, changed).asPatches()
console.log(patches)
// [ { op: 'remove', path: '/roles/1', value: 'User' } ]
```
Compared to `fast-json-patch`:
```js
import { compare } from 'fast-json-patch'

const source = { name: 'Graham', roles: ['Admin', 'User', 'Owner'] }
const changed = { name: 'Graham', roles: ['Admin', 'Owner'] }

const patches = compare(source, changed)
console.log(patches)
// [ { op: 'remove', path: '/roles/2' }, { op: 'replace', path: '/roles/1', value: 'Owner' } ]
```

### 2. Remove 1 element from large array
```js
import { diff } from '@n-rowe/pash'
import data from './large_diff.json'

const patches = diff(data.original, data.new).asPatches()
console.log(patches)
// [ { op: 'remove', path: '/1984', value: { id: '79db2453-96c3-4bd3-8a23-1a22f77754b6', name: 'Gertrude' } } ]
```
Compared to `fast-json-patch`:
```js
import { compare } from 'fast-json-patch'
import data from './large_diff.json'

const patches = compare(data.original, data.new)
console.log(patches)
// [ { op: 'remove', path: '/4999' }, { op: 'replace', path: '/4998/name', value: 'Kyler' } ...6029 more items ],
```
