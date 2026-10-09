import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../../api/teaching'
import { readAnswer } from './read-answer'

afterEach(() => vi.useRealTimers())

async function run(mode: string) {
  const controller = new AbortController()
  const response = GET(
    new Request(`http://localhost/api/teaching?mode=${mode}`, { signal: controller.signal }),
  )
  let text = ''
  const arrivals: string[] = []
  const result = readAnswer(response, {
    signal: controller.signal,
    onText(delta) {
      text += delta
      arrivals.push(text)
    },
  })
  await vi.runAllTimersAsync()
  return { text, arrivals, outcome: await result }
}

describe('完整教学 HTTP 响应链', () => {
  it('即时发送与缓冲发送最终内容一致', async () => {
    vi.useFakeTimers()
    const streaming = await run('stream')
    const buffered = await run('buffered')
    expect(streaming.outcome.kind).toBe('completed')
    expect(buffered.outcome.kind).toBe('completed')
    expect(streaming.text).toBe(buffered.text)
    expect(streaming.text).toContain('**流式回答**')
    expect(streaming.arrivals).toHaveLength(8)
  })
  it('EOF 不能被误报为完成，保留前面收到的内容', async () => {
    vi.useFakeTimers()
    const result = await run('truncated')
    expect(result.outcome.kind).toBe('truncated')
    expect(result.text).toContain('你好')
    expect(result.text).not.toContain('每一步都保留')
  })
  it('保留 HTTP 错误状态', async () => {
    await expect(
      readAnswer(GET(new Request('http://local/api/teaching?mode=error')), {
        signal: new AbortController().signal,
        onText() {},
      }),
    ).rejects.toThrow('HTTP 503')
  })
  it('停止未完成的读取，不再发布后续内容', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let text = ''
    const response = GET(new Request('http://local/api/teaching', { signal: controller.signal }))
    const done = readAnswer(response, {
      signal: controller.signal,
      onText(delta) {
        text += delta
        controller.abort()
      },
    }).catch((error: unknown) => error)
    await vi.runAllTimersAsync()
    expect(await done).toBeInstanceOf(Error)
    expect(text).toBe('你好！')
    expect(vi.getTimerCount()).toBe(0)
  })
})
