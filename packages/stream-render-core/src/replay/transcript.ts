import type { WireChunk } from './split-wire'

/** 把 delta 序列转写成 OpenAI 兼容的完整 SSE 传输字节流（含 [DONE]） */
export function buildSseTranscript(deltas: string[]): Uint8Array {
  let wire = ''
  for (const d of deltas) {
    wire += `data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`
  }
  wire += 'data: [DONE]\n\n'
  return new TextEncoder().encode(wire)
}

/**
 * 按时间线回放 chunk 序列。产出的 ReadableStream 与 fetch 响应体
 * 同构——下游解析代码一行都不用改，这就是回放模式的意义。
 */
export function wireChunksToStream(chunks: WireChunk[], speed = 1): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close()
        return
      }
      const chunk = chunks[i++]
      const delay = chunk.delayMs / speed
      if (delay > 0) await new Promise((r) => setTimeout(r, delay))
      controller.enqueue(chunk.bytes)
    },
  })
}
