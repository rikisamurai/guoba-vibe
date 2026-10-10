import { describe, expect, it } from 'vitest'

import { sseDataEvents } from './sse'

function streamOf(...parts: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = parts.map((p) => (typeof p === 'string' ? encoder.encode(p) : p))
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function collect(body: ReadableStream<Uint8Array>): Promise<string[]> {
  const out: string[] = []
  for await (const data of sseDataEvents(body)) out.push(data)
  return out
}

describe('sseDataEvents', () => {
  it('解析单 chunk 内的单个事件', async () => {
    expect(await collect(streamOf('data: hello\n\n'))).toEqual(['hello'])
  })

  it('一个 chunk 含多个事件', async () => {
    expect(await collect(streamOf('data: a\n\ndata: b\n\n'))).toEqual(['a', 'b'])
  })

  it('事件在任意字符边界被截断', async () => {
    expect(await collect(streamOf('data: he', 'llo\n', '\ndata: wor', 'ld\n\n'))).toEqual([
      'hello',
      'world',
    ])
  })

  it('chunk 在 UTF-8 多字节字符中间截断', async () => {
    const bytes = new TextEncoder().encode('data: 你好\n\n')
    // “你” 的三个字节是 [7,8,9]，从中间劈开
    expect(await collect(streamOf(bytes.slice(0, 8), bytes.slice(8)))).toEqual(['你好'])
  })

  it('data: 后的空格是可选的', async () => {
    expect(await collect(streamOf('data:no-space\n\ndata: with-space\n\n'))).toEqual([
      'no-space',
      'with-space',
    ])
  })

  it('多条 data 行以换行拼接', async () => {
    expect(await collect(streamOf('data: line1\ndata: line2\n\n'))).toEqual(['line1\nline2'])
  })

  it('支持 CRLF 分隔', async () => {
    expect(await collect(streamOf('data: a\r\n\r\ndata: b\r\n\r\n'))).toEqual(['a', 'b'])
  })

  it('忽略注释心跳与非 data 字段', async () => {
    expect(await collect(streamOf(': keep-alive\n\nevent: ping\nid: 3\n\ndata: real\n\n'))).toEqual(
      ['real'],
    )
  })

  it('流结束时冲刷未以空行收尾的事件', async () => {
    expect(await collect(streamOf('data: tail'))).toEqual(['tail'])
  })
})
