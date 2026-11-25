import { batchChecks } from './batch-checks'
import { gateChecks } from './gate-checks'
import { lifecycleChecks } from './lifecycle-checks'
import { renderChecks } from './render-checks'
import { sseChecks } from './sse-checks'
import type { Implementation } from './types'

export interface PracticeCheck {
  id: string
  group: string
  title: string
  file: string
  input: string
  expected: unknown
  run(implementation: Implementation): unknown
}
export interface CheckResult {
  id: string
  group: string
  title: string
  file: string
  input: string
  passed: boolean
  expected: string
  actual: string
}
const encode = (text: string) => new TextEncoder().encode(text)
const utf8Checks: PracticeCheck[] = [
  {
    id: 'utf8-split',
    group: 'utf8',
    title: '中文跨字节读取仍完整',
    file: 'decode.ts',
    input: '“你🙂”的 7 个字节，每次 push 1 个，最后 finish()',
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
    input: 'push([0xE4])（“你”的第 1 个字节），随后 finish()',
    expected: ['', '�'],
    run(impl) {
      const decoder = impl.createDecoder()
      return [decoder.push(Uint8Array.of(0xe4)), decoder.finish()]
    },
  },
]
const providerChecks: PracticeCheck[] = [
  {
    id: 'provider-content',
    group: 'provider',
    title: '只提取 choice 0 的正文',
    file: 'read-event.ts',
    input: '一个事件含两个 choice：先 index 1（“其他候选”），后 index 0（“正文”）',
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
    input: '两个事件：delta 只有 role；choices 为空且带 usage',
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
    input: 'finish_reason 为 length 的事件，随后 [DONE]',
    expected: 'incomplete',
    run(impl) {
      const read = impl.createEventReader()
      read('{"choices":[{"index":0,"delta":{},"finish_reason":"length"}]}')
      return read('[DONE]').outcome?.kind
    },
  },
  {
    id: 'provider-filter',
    group: 'provider',
    title: '内容过滤也不是完整回答',
    file: 'read-event.ts',
    input: 'finish_reason 为 content_filter 的事件，随后 [DONE]',
    expected: 'incomplete',
    run(impl) {
      const read = impl.createEventReader()
      read('{"choices":[{"index":0,"delta":{},"finish_reason":"content_filter"}]}')
      return read('[DONE]').outcome?.kind
    },
  },
  {
    id: 'provider-error',
    group: 'provider',
    title: '服务商错误包不当作空正文',
    file: 'read-event.ts',
    input: '{"error":{"message":"rate limited"}}',
    expected: 'thrown',
    run(impl) {
      try {
        impl.createEventReader()('{"error":{"message":"rate limited"}}')
        return 'accepted'
      } catch {
        return 'thrown'
      }
    },
  },
]
export const practiceChecks = [
  ...utf8Checks,
  ...sseChecks,
  ...providerChecks,
  ...lifecycleChecks,
  ...batchChecks,
  ...renderChecks,
  ...gateChecks,
]
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
