import { describe, expect, it } from 'vitest'

import { takeGraphemes } from './display-scheduler'

describe('takeGraphemes', () => {
  it('普通文本按字符取', () => {
    expect(takeGraphemes('hello', 3)).toEqual(['hel', 'lo'])
  })

  it('不劈开 ZWJ 组合 emoji（家庭是一个 grapheme）', () => {
    const family = '👨‍👩‍👧‍👦'
    const [taken, rest] = takeGraphemes(`${family}后续`, 1)
    expect(taken).toBe(family)
    expect(rest).toBe('后续')
  })

  it('n 超过总量时全取', () => {
    expect(takeGraphemes('你好', 10)).toEqual(['你好', ''])
  })
})
