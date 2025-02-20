# Json Diff
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
