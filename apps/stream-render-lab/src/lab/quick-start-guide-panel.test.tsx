import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { QuickStartGuidePanel } from './quick-start-guide-panel'

const actions = {
  advanceAnimationFrame: async () => {},
  finish: async () => {},
  readNextChunk: async () => {},
  reset() {},
}

describe('QuickStartGuidePanel', () => {
  it('introduces each layer with its established term and source', () => {
    const html = renderToStaticMarkup(
      <QuickStartGuidePanel
        actions={actions}
        snapshot={{
          stage: 'reading-network',
          elapsedMs: 10,
          timelineDurationMs: 32,
          streamChunkTimes: [0, 4],
          progress: {
            streamChunksRead: 2,
            totalStreamChunks: 38,
            sseEvents: 0,
            contentDeltas: 0,
          },
          pipelines: {
            M0: {
              acceptedText: '',
              visibleText: '',
              visibleUpdates: 1,
              visibleUpdateTimes: [6],
            },
            M4: {
              acceptedText: '',
              visibleText: '',
              visibleUpdates: 0,
              visibleUpdateTimes: [],
            },
          },
        }}
      />,
    )

    expect(html).toContain('浏览器读到一次数据，不等于模型新增一次文本')
    expect(html).toContain('chunk')
    expect(html).toContain('WHATWG Streams')
    expect(html).toContain('SSE event')
    expect(html).toContain('WHATWG HTML')
    expect(html).toContain('choices[].delta.content')
    expect(html).toContain('DeepSeek Chat Completions')
    expect(html).toContain('显示文本状态更新')
    expect(html).toContain('本课程模型')
    expect(html).toContain('逐增量更新（M0）')
    expect(html).toContain('合并更新（M4）')
    expect(html).toContain('M0 / M4')
    expect(html).toContain('不是行业标准')
    expect(html).toContain('01 读取与解析')
    expect(html).toContain('02 已接收与显示')
    expect(html).toContain('03 最终结果')
    expect(html).toContain('回放时间 00.01s')
    expect(html).toContain('读取 chunk')
    expect(html).toContain('M0 显示文本状态更新')
    expect(html).toContain('M4 显示文本状态更新')
    expect(html).toContain('不等于 React 提交 DOM 或浏览器绘制')
    expect(html).toContain('inset-inline-start:12.5%')
    expect(html).toContain('逐增量更新（M0）当前显示')
    expect(html).toContain('合并更新（M4）当前显示')
    expect(html).toContain('术语说明与来源')
    expect(html).not.toMatch(/Stream chunk|wire chunk|Engine publish|Engine commits|Render IR/i)
  })

  it('lets the learner advance one chunk at a time before an SSE event exists', () => {
    const html = renderToStaticMarkup(
      <QuickStartGuidePanel
        actions={actions}
        snapshot={{
          stage: 'reading-network',
          progress: {
            streamChunksRead: 2,
            totalStreamChunks: 38,
            sseEvents: 0,
            contentDeltas: 0,
          },
          pipelines: {
            M0: { acceptedText: '', visibleText: '', visibleUpdates: 0 },
            M4: { acceptedText: '', visibleText: '', visibleUpdates: 0 },
          },
        }}
      />,
    )
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    expect(text).toContain('已读取 chunk 2 / 38')
    expect(text).toContain('SSE events 0')
    expect(text).toContain('delta.content 文本 0')
    expect(html).toContain('还没有组成一个完整的 SSE event')
    expect(html).toContain('读取下一个 chunk')
    expect(html).toContain('aria-live="polite"')
    expect(html.match(/<button/g)).toHaveLength(1)
  })

  it('shows that accepted text can wait before the next visible update', () => {
    const html = renderToStaticMarkup(
      <QuickStartGuidePanel
        actions={actions}
        snapshot={{
          stage: 'visible-update-pending',
          progress: {
            streamChunksRead: 5,
            totalStreamChunks: 38,
            sseEvents: 1,
            contentDeltas: 1,
          },
          pipelines: {
            M0: { acceptedText: 'Hello', visibleText: 'Hello', visibleUpdates: 1 },
            M4: { acceptedText: 'Hello', visibleText: '', visibleUpdates: 0 },
          },
        }}
      />,
    )
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    expect(html).toContain('文本已经接收，但还没有全部显示')
    expect(html).toContain('已接收文本')
    expect(html).toContain('当前显示文本')
    expect(text).toContain('等待显示 5 个字符')
    expect(html).toContain('显示已接收文本')
    expect(html).toContain('这不代表丢字')
  })

  it('makes the released visible update an explicit checkpoint', () => {
    const html = renderToStaticMarkup(
      <QuickStartGuidePanel
        actions={actions}
        snapshot={{
          stage: 'visible-updated',
          progress: {
            streamChunksRead: 5,
            totalStreamChunks: 38,
            sseEvents: 1,
            contentDeltas: 1,
          },
          pipelines: {
            M0: { acceptedText: 'Hello', visibleText: 'Hello', visibleUpdates: 1 },
            M4: { acceptedText: 'Hello', visibleText: 'Hello', visibleUpdates: 1 },
          },
        }}
      />,
    )
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    expect(html).toContain('已接收文本现在已经显示')
    expect(text).toContain('等待显示 0 个字符')
    expect(html).toContain('继续到完整回复')
  })

  it('compares visible updates only after both strategies reach the same result', () => {
    const html = renderToStaticMarkup(
      <QuickStartGuidePanel
        actions={actions}
        snapshot={{
          stage: 'settled',
          progress: {
            streamChunksRead: 38,
            totalStreamChunks: 38,
            sseEvents: 19,
            contentDeltas: 18,
          },
          pipelines: {
            M0: { acceptedText: 'Hello', visibleText: 'Hello', visibleUpdates: 4 },
            M4: { acceptedText: 'Hello', visibleText: 'Hello', visibleUpdates: 2 },
          },
        }}
      />,
    )
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    expect(html).toContain('先确认最终结果一致，再比较显示文本状态更新次数')
    expect(text).toContain('最终接收文本 相同')
    expect(text).toContain('最终显示文本 相同')
    expect(text).toContain('M0 4 次')
    expect(text).toContain('M4 2 次')
    expect(html).toContain('逐增量更新（M0）当前显示')
    expect(html).toContain('合并更新（M4）当前显示')
    expect(html.match(/Hello/g)).toHaveLength(2)
    expect(html).toContain('没有证明 React 渲染一定更快')
    expect(html).not.toMatch(/commit|Engine publish|Render IR/i)
  })
})
