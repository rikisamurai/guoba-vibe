// Local teaching source: deterministic content, real HTTP, no model or API key.
const PARTS = [
  '你好！',
  '这是一个通过 HTTP 发送的',
  '**流式回答**。\n\n',
  '你可以：\n',
  '- 停止生成\n',
  '- 观察缓冲\n',
  '- 模拟中途断开\n\n',
  '每一步都保留已经收到的文字。',
]
const encoder = new TextEncoder()

function delta(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\n`
}

export function GET(request: Request): Response {
  const mode = new URL(request.url).searchParams.get('mode') ?? 'stream'
  if (!['stream', 'split', 'buffered', 'truncated', 'error'].includes(mode)) {
    return new Response('Unknown teaching mode', { status: 400 })
  }
  if (mode === 'error') return new Response('教学故障：服务暂时不可用', { status: 503 })
  let timer: ReturnType<typeof setTimeout> | undefined
  let cleanup: (() => void) | undefined
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0
      let buffer = ''
      let splitTail: Uint8Array | undefined
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        cleanup?.()
        controller.close()
      }
      cleanup = () => {
        clearTimeout(timer)
        request.signal.removeEventListener('abort', close)
      }
      if (request.signal.aborted) {
        close()
        return
      }
      request.signal.addEventListener('abort', close, { once: true })
      const tick = () => {
        if (closed) return
        if (splitTail) {
          controller.enqueue(splitTail)
          splitTail = undefined
          timer = setTimeout(tick, 80)
          return
        }
        if (mode === 'truncated' && index === 4) {
          close()
          return
        }
        if (index < PARTS.length) {
          const packet = delta(PARTS[index++])
          if (mode === 'buffered') buffer += packet
          else {
            const bytes = encoder.encode(packet)
            if (mode === 'split') {
              // Deliberately cut inside UTF-8; a proxy/browser may still merge writes.
              const boundary = bytes.findIndex((byte) => byte > 127) + 1
              controller.enqueue(bytes.slice(0, boundary))
              splitTail = bytes.slice(boundary)
            } else controller.enqueue(bytes)
          }
          timer = setTimeout(tick, mode === 'split' ? 80 : 160)
          return
        }
        const terminal =
          'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'
        controller.enqueue(encoder.encode(buffer + terminal))
        close()
      }
      timer = setTimeout(tick, 160)
    },
    cancel() {
      cleanup?.()
    },
  })
  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  })
}
