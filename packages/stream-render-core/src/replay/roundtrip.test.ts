import { describe, expect, it } from 'vitest'

import { chatDeltas } from '../transport/openai'
import { FIXTURE_MARKDOWN } from './fixture'
import { splitAdversarial, splitUniform } from './split-content'
import { sliceBurst, sliceJitter, sliceUniform } from './split-wire'
import type { WireChunk } from './split-wire'
import { buildSseTranscript, wireChunksToStream } from './transcript'

async function reassemble(chunks: WireChunk[]): Promise<string> {
  // speed 调到极大，测试里不真实等待时间线
  const stream = wireChunksToStream(chunks, 1e9)
  let text = ''
  for await (const d of chatDeltas(stream)) text += d.content ?? ''
  return text
}

describe('回放全链路往返', () => {
  const transcript = buildSseTranscript(splitAdversarial(FIXTURE_MARKDOWN))

  it('恶意内容切分 + jitter 字节切割后无损还原', async () => {
    expect(await reassemble(sliceJitter(transcript, { seed: 42 }))).toBe(FIXTURE_MARKDOWN)
  })

  it('7 字节均匀切割（必然劈开多字节字符与 SSE 帧）后无损还原', async () => {
    expect(await reassemble(sliceUniform(transcript, 7, 0))).toBe(FIXTURE_MARKDOWN)
  })

  it('burst 代理缓冲画像后无损还原', async () => {
    expect(await reassemble(sliceBurst(transcript))).toBe(FIXTURE_MARKDOWN)
  })

  it('均匀内容切分同样往返成功', async () => {
    const uniform = buildSseTranscript(splitUniform(FIXTURE_MARKDOWN, 3))
    expect(await reassemble(sliceJitter(uniform, { seed: 7 }))).toBe(FIXTURE_MARKDOWN)
  })
})

describe('切割器确定性', () => {
  it('同一 seed 产出完全相同的时间线', () => {
    const a = sliceJitter(buildSseTranscript(['abc']), { seed: 123 })
    const b = sliceJitter(buildSseTranscript(['abc']), { seed: 123 })
    expect(a).toEqual(b)
  })

  it('恶意切分把 ** 劈成两半', () => {
    const deltas = splitAdversarial('a **b** c')
    expect(deltas).toContain('*')
    expect(deltas.join('')).toBe('a **b** c')
  })
})
