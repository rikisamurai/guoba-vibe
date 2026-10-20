const ENCODER = new TextEncoder()

const CONTENT_DELTAS = ['# Streaming\n\n', '浏览器先读到字节，', '界面稍后更新。'] as const
const STREAM_DELAYS_MS = [2, 3, 4, 4, 4, 5] as const

export interface QuickStartStreamChunk {
  bytes: Uint8Array
  delayMs: number
}

export function createQuickStartStreamChunks(): readonly QuickStartStreamChunk[] {
  const firstEvent = encodeSseData(chatChunk(CONTENT_DELTAS[0]))
  const firstEventSplit = splitFirstEvent(firstEvent)
  const remaining = CONTENT_DELTAS.slice(1).map((delta) =>
    ENCODER.encode(encodeSseData(chatChunk(delta))),
  )
  const terminal = ENCODER.encode(`${encodeSseData(chatChunk('', 'stop'))}data: [DONE]\n\n`)
  return [...firstEventSplit, ...remaining, terminal].map((bytes, index) => ({
    bytes,
    delayMs: STREAM_DELAYS_MS[index] ?? 0,
  }))
}

function splitFirstEvent(event: string): readonly Uint8Array[] {
  const bytes = ENCODER.encode(event)
  const first = Math.min(24, bytes.length - 3)
  const second = bytes.length - 2
  return [bytes.slice(0, first), bytes.slice(first, second), bytes.slice(second)]
}

function encodeSseData(data: string): string {
  return `data: ${data}\n\n`
}

function chatChunk(content: string, finishReason: string | null = null): string {
  return JSON.stringify({
    id: 'quick-start-guide',
    object: 'chat.completion.chunk',
    choices: [
      {
        index: 0,
        delta: content === '' ? {} : { content },
        finish_reason: finishReason,
      },
    ],
  })
}
