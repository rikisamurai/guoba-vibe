import { batchChecks } from './batch-checks'
import { lifecycleChecks } from './lifecycle-checks'
import type { Implementation } from './types'

export interface PracticeCheck {
  id: string
  group: string
  title: string
  file: string
  expected: unknown
  run(implementation: Implementation): unknown
}
export interface CheckResult {
  id: string
  group: string
  title: string
  file: string
  passed: boolean
  expected: string
  actual: string
}
const encode = (text: string) => new TextEncoder().encode(text)
const protocolChecks: PracticeCheck[] = [
  {
    id: 'utf8-split',
    group: 'utf8',
    title: '中文跨字节读取仍完整',
    file: 'decode.ts',
    expected: '你🙂',
    run(impl) {
      const decoder = impl.createDecoder()
      return (
        [...encode('你🙂')].map((byte) => decoder.push(Uint8Array.of(byte))).join('') +
        decoder.finish()
      )
    },
  },
  {
    id: 'utf8-flush',
    group: 'utf8',
    title: 'EOF 才释放未完成字符',
    file: 'decode.ts',
    expected: ['', '�'],
    run(impl) {
      const decoder = impl.createDecoder()
      return [decoder.push(Uint8Array.of(0xe4)), decoder.finish()]
    },
  },
  {
    id: 'sse-split',
    group: 'sse',
    title: '半条事件暂存，两条事件拆开',
    file: 'parse-events.ts',
    expected: [[], ['一', '二']],
    run(impl) {
      const parser = impl.createEventParser()
      return [parser.push('data: 一\n'), parser.push('\ndata: 二\n\n')]
    },
  },
  {
    id: 'sse-crlf',
    group: 'sse',
    title: 'CRLF 跨读取边界仍派发',
    file: 'parse-events.ts',
    expected: ['一'],
    run(impl) {
      const parser = impl.createEventParser()
      return [...parser.push('data: 一\r'), ...parser.push('\n\r'), ...parser.push('\n')]
    },
  },
  {
    id: 'sse-fields',
    group: 'sse',
    title: '忽略注释，合并多行 data',
    file: 'parse-events.ts',
    expected: ['一\n二'],
    run(impl) {
      return impl.createEventParser().push(': ping\nevent: message\ndata: 一\ndata: 二\n\n')
    },
  },
  {
    id: 'sse-eof',
    group: 'sse',
    title: 'EOF 丢弃未由空行结束的事件',
    file: 'parse-events.ts',
    expected: [],
    run(impl) {
      const parser = impl.createEventParser()
      return [...parser.push('data: unfinished\n'), ...parser.finish()]
    },
  },
  {
    id: 'provider-content',
    group: 'provider',
    title: '只提取 choice 0 的正文',
    file: 'read-event.ts',
    expected: '正文',
    run(impl) {
      return impl.createEventReader()(
        JSON.stringify({
          choices: [
            { index: 1, delta: { content: '其他候选' } },
            { index: 0, delta: { content: '正文' } },
          ],
        }),
      ).text
    },
  },
  {
    id: 'provider-meta',
    group: 'provider',
    title: 'role 和 usage 不进入正文',
    file: 'read-event.ts',
    expected: '',
    run(impl) {
      const read = impl.createEventReader()
      return (
        (read('{"choices":[{"index":0,"delta":{"role":"assistant"}}]}').text ?? '') +
        (read('{"choices":[],"usage":{"total_tokens":3}}').text ?? '')
      )
    },
  },
  {
    id: 'provider-length',
    group: 'provider',
    title: '长度限制不是完整回答',
    file: 'read-event.ts',
    expected: 'incomplete',
    run(impl) {
      const read = impl.createEventReader()
      read('{"choices":[{"index":0,"delta":{},"finish_reason":"length"}]}')
      return read('[DONE]').outcome?.kind
    },
  },
]
export const practiceChecks = [...protocolChecks, ...lifecycleChecks, ...batchChecks]
export async function runAcceptance(
  implementation: Implementation,
  group?: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  for (const check of practiceChecks.filter((item) => !group || item.group === group)) {
    let actual: string
    try {
      // oxlint-disable-next-line no-await-in-loop -- isolate fixture readers and clocks
      actual = JSON.stringify(await check.run(implementation)) ?? 'undefined'
    } catch (error) {
      actual = error instanceof Error ? error.message : String(error)
    }
    const expected = JSON.stringify(check.expected)
    results.push({ ...check, passed: actual === expected, expected, actual })
  }
  return results
}
