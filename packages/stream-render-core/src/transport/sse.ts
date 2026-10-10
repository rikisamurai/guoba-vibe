/**
 * 手写 SSE 解析：字节流 → 每个事件的 data 载荷字符串。
 *
 * 刻意不用任何 SDK——这里要暴露流式传输的全部边界情况：
 * - chunk 可能在任意字节处截断（包括 UTF-8 多字节字符中间）
 * - 一个 chunk 可能包含零个、半个或多个事件
 * - 事件以空行分隔；data 行可能有多条（拼接时补 \n）
 */
export async function* sseDataEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader()
  // stream: true 让解码器把跨 chunk 的多字节字符缓存到下一次调用
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })

      let boundary: number
      while ((boundary = buffer.search(/\n\n|\r\n\r\n/)) !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + (buffer[boundary] === '\r' ? 4 : 2))
        const data = parseEventData(rawEvent)
        if (data !== null) yield data
      }

      if (done) {
        const data = parseEventData(buffer)
        if (data !== null) yield data
        return
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** 取出一个原始事件块里的 data 载荷；无 data 行（纯注释/心跳）返回 null */
function parseEventData(rawEvent: string): string | null {
  const dataLines: string[] = []
  for (const line of rawEvent.split(/\r\n|\n/)) {
    if (line.startsWith('data:')) {
      // 规范允许 "data:" 后跟一个可选空格
      dataLines.push(line.slice(line[5] === ' ' ? 6 : 5))
    }
    // event:/id:/retry:/":" 注释行在 OpenAI 兼容协议里用不到，忽略
  }
  return dataLines.length > 0 ? dataLines.join('\n') : null
}
