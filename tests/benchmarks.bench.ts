import { faker } from '@faker-js/faker'
import { compare } from 'fast-json-patch'
import { diff as odiff } from 'ohash/utils'
import { bench, describe } from 'vitest'
import { diff } from '../src/index.js'

/**
 * Creates a large array for diffing.
 * @param size The array size
 */
function generateShuffled(size: number) {
  return faker.helpers.multiple(
    () => ({ id: faker.string.uuid(), name: faker.person.fullName() }),
    { count: size },
  )
}

for (const size of [10, 100, 1000, 5000]) {
  const humanisedSize = size.toLocaleString('en-US')
  const original = generateShuffled(size)

  // Shuffle Elements
  const replacedElements = faker.helpers.shuffle(original)
  describe(`${humanisedSize} element array shuffled`, () => {
    bench(`pash`, () => {
      diff(original, replacedElements)
    })

    bench(`fast-json-patch`, () => {
      compare(original, replacedElements)
    })

    bench(`ohash`, () => {
      odiff(original, replacedElements)
    })
  })

  // Remove 25% of the array
  const removedElements = faker.helpers.arrayElements(original, size * 0.75)
  describe(`${humanisedSize} element array reduced`, () => {
    bench(`pash`, () => {
      diff(original, removedElements)
    })

    bench(`fast-json-patch`, () => {
      compare(original, removedElements)
    })

    bench(`ohash`, () => {
      odiff(original, removedElements)
    })
  })
}
