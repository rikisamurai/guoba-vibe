import { expect, test } from 'vitest'

import { cx } from './cx'

test('joins truthy class parts with spaces', () => {
  expect(cx('a', 'b')).toBe('a b')
})

test('drops false, null and undefined parts', () => {
  expect(cx('a', false, null, undefined, 'b')).toBe('a b')
})

test('returns empty string for no parts', () => {
  expect(cx()).toBe('')
})
