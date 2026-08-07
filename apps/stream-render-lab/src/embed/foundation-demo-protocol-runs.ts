import { UTF8_FIXTURE_CHUNKS, UTF8_FIXTURE_TEXT } from '../../workshop/mini-chat/04-utf8/fixture'
import { decodeUtf8Chunks, decodeUtf8Steps } from '../../workshop/mini-chat/04-utf8/solution/index'
import { SSE_FIXTURE_CHUNKS } from '../../workshop/mini-chat/05-sse/fixture'
import { parseEventStream } from '../../workshop/mini-chat/05-sse/solution/sse'
import type { ChatCompletionEvent } from '../../workshop/mini-chat/06-chat-completions/contract'
import { CHAT_COMPLETIONS_FIXTURE_CHUNKS } from '../../workshop/mini-chat/06-chat-completions/fixture'
import { adaptChatCompletions } from '../../workshop/mini-chat/06-chat-completions/solution/chat-completions'
import { parseEventStream as parseChatStream } from '../../workshop/mini-chat/06-chat-completions/solution/sse'
import type { FoundationDemoId, FoundationFrame, FoundationTrace } from './foundation-demo-model'
import { expectedChatEventsFromFixture, expectedSseFromFixture } from './foundation-demo-oracle'

type ProtocolDemoId = Extract<FoundationDemoId, 'chat-adapter' | 'sse' | 'utf8'>

export function runProtocolFoundationDemo(demoId: ProtocolDemoId): FoundationTrace {
  if (demoId === 'utf8') return runUtf8()
  if (demoId === 'sse') return runSse()
  return runChatAdapter()
}

function runUtf8(): FoundationTrace {
  const steps = decodeUtf8Steps(UTF8_FIXTURE_CHUNKS)
  const frames = steps.map((step) => {
    const chunk = UTF8_FIXTURE_CHUNKS[step.index]
    return {
      arrival: `byte ${step.index + 1}/${UTF8_FIXTURE_CHUNKS.length}`,
      event: `persistent decoder delta → ${JSON.stringify(step.delta)}`,
      note:
        step.delta === ''
          ? 'solution 正在保留未完成 code point。'
          : '输出来自同一 persistent decoder。',
      visible: step.visible,
      wire: hex(chunk ?? new Uint8Array()),
    }
  })
  const finalVisible = decodeUtf8Chunks(UTF8_FIXTURE_CHUNKS)
  const hasReplacement = steps.some(({ visible }) => visible.includes('\uFFFD'))
  return {
    actualEventCount: steps.length,
    actualProof: JSON.stringify({ hasReplacement, visible: finalVisible }),
    demoId: 'utf8',
    expectedEventCount: UTF8_FIXTURE_CHUNKS.length,
    expectedProof: JSON.stringify({ hasReplacement: false, visible: UTF8_FIXTURE_TEXT }),
    expectedVisible: UTF8_FIXTURE_TEXT,
    frames,
    proofLabel: 'UTF-8 solution 的最终文本等于 fixture 声明的原文',
    terminalObserved: steps.length === UTF8_FIXTURE_CHUNKS.length,
  }
}

function runSse(): FoundationTrace {
  const frames: FoundationFrame[] = [emptyProtocolFrame(SSE_FIXTURE_CHUNKS)]
  let previousSignature = ''
  for (let index = 0; index < SSE_FIXTURE_CHUNKS.length; index += 1) {
    const prefix = SSE_FIXTURE_CHUNKS.slice(0, index + 1)
    const parsed = parseEventStream(prefix)
    const signature = JSON.stringify(parsed)
    const isLast = index === SSE_FIXTURE_CHUNKS.length - 1
    if (signature === previousSignature && !isLast) continue
    previousSignature = signature
    frames.push({
      arrival: `byte ${index + 1}/${SSE_FIXTURE_CHUNKS.length}`,
      event: signature,
      note: isLast
        ? 'EOF residue 已交给真实 parser 决定是否丢弃。'
        : 'parser 状态产生了可观察变化。',
      visible: parsed.events.map(({ data }) => data).join('\n\n'),
      wire: hexTail(prefix),
    })
  }
  const actual = parseEventStream(SSE_FIXTURE_CHUNKS)
  const expected = expectedSseFromFixture(SSE_FIXTURE_CHUNKS)
  return {
    actualEventCount: actual.events.length,
    actualProof: JSON.stringify(actual),
    demoId: 'sse',
    expectedEventCount: expected.events.length,
    expectedProof: JSON.stringify(expected),
    expectedVisible: expected.events.map(({ data }) => data).join('\n\n'),
    frames,
    proofLabel: 'SSE solution 的 events、id 与 retry 符合 wire fixture',
    terminalObserved: actual.events.length === expected.events.length && expected.events.length > 0,
  }
}

function runChatAdapter(): FoundationTrace {
  const parsed = parseChatStream(CHAT_COMPLETIONS_FIXTURE_CHUNKS)
  const actual = adaptChatCompletions(parsed.events)
  const expected = expectedChatEventsFromFixture(CHAT_COMPLETIONS_FIXTURE_CHUNKS)
  const frames: FoundationFrame[] = [emptyProtocolFrame(CHAT_COMPLETIONS_FIXTURE_CHUNKS)]
  let visible = ''
  actual.forEach((event, index) => {
    if (event.kind === 'content-delta') visible += event.text
    frames.push({
      arrival: `typed event ${index + 1}/${actual.length}`,
      event: JSON.stringify(event),
      note:
        event.kind === 'reasoning-delta'
          ? 'reasoning 不进入 answer visible。'
          : '事件由真实 adapter 产出。',
      visible,
      wire: parsed.events[index]?.data ?? '(no matching SSE event)',
    })
  })
  const expectedVisible = expected
    .filter(
      (event): event is Extract<ChatCompletionEvent, { kind: 'content-delta' }> =>
        event.kind === 'content-delta',
    )
    .map(({ text }) => text)
    .join('')
  return {
    actualEventCount: actual.length,
    actualProof: JSON.stringify(actual),
    demoId: 'chat-adapter',
    expectedEventCount: expected.length,
    expectedProof: JSON.stringify(expected),
    expectedVisible,
    frames,
    proofLabel: 'Chat adapter 的 reasoning、content、finish 与 DONE 符合 wire fixture',
    terminalObserved: actual.at(-1)?.kind === 'done',
  }
}

function emptyProtocolFrame(chunks: readonly Uint8Array[]): FoundationFrame {
  return {
    arrival: 'before first chunk',
    event: 'no parsed output',
    note: '接下来所有帧都由 workshop solution 执行结果构造。',
    visible: '',
    wire: `${chunks.length} fixture chunks queued`,
  }
}

function hex(chunk: Uint8Array): string {
  return [...chunk].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

function hexTail(chunks: readonly Uint8Array[]): string {
  return chunks.slice(-8).map(hex).join(' ')
}
