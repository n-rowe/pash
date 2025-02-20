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
import { jsonDiff } from '@n-rowe/pash'

const source = { name: 'Graham', roles: ['Admin', 'User', 'Owner'] }
const changed = { name: 'Graham', roles: ['Admin', 'Owner'] }

const patches = jsonDiff(source, changed).asPatches()
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

## Performance
The below benchmarks

|name                                     |        hz |      min  |      max  |     mean  |      p75  |      p99  |     p995  |    p999   |     rme  | samples  |
|-----------------------------------------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|----------|----------|
|diff 10 element array - replaced         |93,618.69  |   0.0096  |   0.4490  |   0.0107  |   0.0102  |   0.0160  |   0.0179  |   0.3244  |±1.03%    |46810     |
|diff 10 element array - removed          |99,752.78  |   0.0088  |   1.0518  |   0.0100  |   0.0093  |   0.0161  |   0.0180  |   0.3240  |±1.42%    |49877     |
|diff 100 element array - replaced        | 9,447.57  |   0.0942  |   0.5858  |   0.1058  |   0.1015  |   0.4198  |   0.4719  |   0.5418  |±1.10%    | 4724     |
|diff 100 element array - removed         |10,879.35  |   0.0802  |   1.0185  |   0.0919  |   0.0875  |   0.1794  |   0.4543  |   0.6893  |±1.27%    | 5440     |
|diff 1,000 element array - replaced      |   905.30  |   0.9948  |   1.7474  |   1.1046  |   1.0652  |   1.6649  |   1.6938  |   1.7474  |±1.38%    |  453     |
|diff 1,000 element array - removed       | 1,043.28  |   0.8538  |   1.7705  |   0.9585  |   0.9202  |   1.5722  |   1.5987  |   1.7705  |±1.60%    |  522     |
|diff 10,000 element array - replaced     |  62.9989  |  14.0434  |  19.2226  |  15.8733  |  16.3165  |  19.2226  |  19.2226  |  19.2226  |±2.45%    |   32     |
|diff 10,000 element array - removed      |  81.7390  |  11.8721  |  13.0953  |  12.2341  |  12.2639  |  13.0953  |  13.0953  |  13.0953  |±0.60%    |   41     |
|diff 100,000 element array - replaced    |   3.5736  |   268.61  |   290.03  |   279.83  |   283.31  |   290.03  |   290.03  |   290.03  |±1.69%    |   10     |
|diff 100,000 element array - removed     |   4.4325  |   215.69  |   234.25  |   225.61  |   229.61  |   234.25  |   234.25  |   234.25  |±1.75%    |   10     |
|diff 1,000,000 element array - replaced  |   0.2374  | 3,913.30  | 4,640.21  | 4,212.45  | 4,587.66  | 4,640.21  | 4,640.21  | 4,640.21  |±5.49%    |   10     |
|diff 1,000,000 element array - removed   |   0.2865  | 3,212.01  | 3,794.05  | 3,490.10  | 3,756.48  | 3,794.05  | 3,794.05  | 3,794.05  |±4.59%    |   10     |
|diff 5,000,000 element array - replaced  |   0.0337  |28,864.12  |30,565.22  |29,707.24  |30,091.48  |30,565.22  |30,565.22  |30,565.22  |±1.28%    |   10     |
|diff 5,000,000 element array - removed   |   0.0394  |24,774.62  |26,070.49  |25,360.40  |25,513.25  |26,070.49  |26,070.49  |26,070.49  |±1.08%    |   10     |
> Ran with AMD Ryzen 7 7800X3D 8-Core
