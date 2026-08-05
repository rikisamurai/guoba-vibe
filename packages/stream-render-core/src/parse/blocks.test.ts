import { describe, expect, it } from 'vitest'

import { splitBlocks } from './blocks'

describe('splitBlocks', () => {
  it('按空行切分段落，尾块未闭合', () => {
    const blocks = splitBlocks('段落一\n\n段落二\n\n正在输入的段落')
    expect(blocks.map((b) => b.text)).toEqual(['段落一', '段落二', '正在输入的段落'])
    expect(blocks.map((b) => b.closed)).toEqual([true, true, false])
  })

  it('闭合的代码围栏是独立块', () => {
    const blocks = splitBlocks('前文\n\n```ts\nconst a = 1\n```\n\n后文')
    expect(blocks).toHaveLength(3)
    expect(blocks[1]).toMatchObject({ fence: true, closed: true, lang: 'ts' })
  })

  it('未闭合围栏吞掉其后所有行且标记为未闭合', () => {
    const blocks = splitBlocks('```python\nprint(1)\n\nprint(2)')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ fence: true, closed: false, lang: 'python' })
    expect(blocks[0].text).toContain('print(2)')
  })

  it('append 增量只影响尾块，前缀块逐字不变（稳定前缀的前提）', () => {
    const before = splitBlocks('# 标题\n\n段落完整。\n\n正在输')
    const after = splitBlocks('# 标题\n\n段落完整。\n\n正在输入更多字')
    expect(after[0]).toEqual(before[0])
    expect(after[1]).toEqual(before[1])
    expect(after[2].text).not.toEqual(before[2].text)
  })

  it('块拼回原文（无损性）', () => {
    const src = '# A\n\n- 1\n- 2\n\n```js\nx\n```\n\n尾巴'
    const blocks = splitBlocks(src)
    // 块之间的分隔空行在切分时被消费，拼回时补空行即可对齐语义
    expect(blocks.map((b) => b.text).join('\n\n')).toBe(src)
  })
})
