import { expect, test } from 'vitest'

import { floorGraphemeBoundary, nextGraphemeBoundary } from './grapheme'

test('plain ASCII: every index is a boundary', () => {
  expect(floorGraphemeBoundary('hello', 3)).toBe(3)
  expect(nextGraphemeBoundary('hello', 3)).toBe(4)
})

test('does not split a ZWJ family emoji', () => {
  const family = '👨‍👩‍👧‍👦' // 11 code units
  const text = `hi ${family} ok`
  for (let index = 4; index < 3 + family.length; index++) {
    expect(floorGraphemeBoundary(text, index)).toBe(3)
  }
  expect(nextGraphemeBoundary(text, 3)).toBe(3 + family.length)
})

test('does not split a flag emoji', () => {
  const text = '🇯🇵!' // flag = 4 code units
  expect(floorGraphemeBoundary(text, 2)).toBe(0)
  expect(nextGraphemeBoundary(text, 0)).toBe(4)
})

test('keeps combining characters attached', () => {
  const text = 'café!' // e + combining acute
  expect(floorGraphemeBoundary(text, 4)).toBe(3)
})

test('clamps out-of-range indexes', () => {
  expect(floorGraphemeBoundary('abc', -1)).toBe(0)
  expect(floorGraphemeBoundary('abc', 99)).toBe(3)
  expect(nextGraphemeBoundary('abc', 99)).toBe(3)
})
