import { faker } from '@faker-js/faker'
import { bench } from 'vitest'
import { jsonDiff } from '../src/index.js'

/**
 * Creates a large array for diffing.
 * @param size The array size
 */
function generateShuffled(size: number): string[] {
  return faker.helpers.multiple(
    () => faker.string.uuid(),
    { count: size },
  )
}

for (const size of [10, 100, 1000, 10_000, 100_000]) {
  const humanisedSize = size.toLocaleString('en-US')
  const original = generateShuffled(size)

  // Shuffle Elements
  const replacedElements = faker.helpers.shuffle(original)
  bench(`diff ${humanisedSize} element array - replaced`, () => {
    jsonDiff(original, replacedElements)
  }, { throws: true })

  // Remove 25% of the array
  const removedElements = faker.helpers.arrayElements(original, size * 0.75)
  bench(`diff ${humanisedSize} element array - removed`, () => {
    jsonDiff(original, removedElements)
  }, { throws: true })
}
