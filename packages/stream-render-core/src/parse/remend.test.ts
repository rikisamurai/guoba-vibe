import { describe, expect, it } from 'vitest'

import { remendFence, remendTail } from './remend'

describe('remendTail', () => {
  it('补全未闭合的粗体', () => {
    expect(remendTail('结尾是**强调')).toBe('结尾是**强调**')
  })

  it('补全未闭合的斜体', () => {
    expect(remendTail('一个*斜体')).toBe('一个*斜体*')
  })

  it('补全未闭合的行内代码', () => {
    expect(remendTail('看 `code')).toBe('看 `code`')
  })

  it('已平衡的文本原样返回', () => {
    const s = '**完整** 和 `code` 与 *斜体*'
    expect(remendTail(s)).toBe(s)
  })

  it('粗体与斜体混合不平衡时按序补全', () => {
    expect(remendTail('**粗体里有*斜体')).toBe('**粗体里有*斜体***')
  })
})

describe('remendFence', () => {
  it('用同款围栏标记假闭合', () => {
    expect(remendFence('```ts\nconst a')).toBe('```ts\nconst a\n```')
    expect(remendFence('~~~\nx')).toBe('~~~\nx\n~~~')
  })
})
