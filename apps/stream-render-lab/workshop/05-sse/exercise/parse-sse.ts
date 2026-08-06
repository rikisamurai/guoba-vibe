import type {
  LessonUtf8Decoder,
  LineDrainResult,
  ParsedSseField,
  SseImplementation,
} from '../contract'

export function createLessonDecoder(): LessonUtf8Decoder {
  return {
    // TODO 1: 持久化同一个 TextDecoder，并在 push 时使用 stream: true。
    push: (chunk) => new TextDecoder().decode(chunk),
    finish: () => '',
  }
}

export function drainLessonLines(input: string, _eof: boolean): LineDrainResult {
  // TODO 2: 在不吞掉 trailing CR 的前提下处理 LF、CR 和 CRLF。
  const pieces = input.split('\n')
  return { lines: pieces.slice(0, -1), rest: pieces.at(-1) ?? '' }
}

export function parseLessonField(line: string): ParsedSseField | undefined {
  if (line.startsWith(':')) return undefined
  // TODO 3: 只在第一个冒号处切分，并只移除最多一个前导空格。
  const [name, value = ''] = line.split(':')
  return { name, value: value.trimStart() }
}

export const parseLessonSse: SseImplementation = async (chunks) => {
  const events = []
  for await (const chunk of chunks) {
    // TODO: 使用持久 TextDecoder，并跨 chunk 保留 line / event state。
    const text = new TextDecoder().decode(chunk)
    if (text.startsWith('data:')) events.push({ data: text.slice(5).trimStart() })
  }
  return events
}
