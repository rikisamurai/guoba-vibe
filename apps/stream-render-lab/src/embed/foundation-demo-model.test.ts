import { describe, expect, it } from 'vitest'

import { STATIC_CHAT_FIXTURE } from '../../workshop/mini-chat/01-static-chat/fixture'
import { REPLAY_FIXTURE } from '../../workshop/mini-chat/02-replay-clock/fixture'
import { M0_FIXTURE } from '../../workshop/mini-chat/03-m0-baseline/fixture'
import { createM0Renderer } from '../../workshop/mini-chat/03-m0-baseline/solution/index'
import { UTF8_FIXTURE_CHUNKS, UTF8_FIXTURE_TEXT } from '../../workshop/mini-chat/04-utf8/fixture'
import { decodeUtf8Chunks, decodeUtf8Steps } from '../../workshop/mini-chat/04-utf8/solution/index'
import { SSE_FIXTURE_CHUNKS } from '../../workshop/mini-chat/05-sse/fixture'
import { parseEventStream } from '../../workshop/mini-chat/05-sse/solution/sse'
import { CHAT_COMPLETIONS_FIXTURE_CHUNKS } from '../../workshop/mini-chat/06-chat-completions/fixture'
import { adaptChatCompletions } from '../../workshop/mini-chat/06-chat-completions/solution/chat-completions'
import { parseEventStream as parseChatStream } from '../../workshop/mini-chat/06-chat-completions/solution/sse'
import { FOUNDATION_DEMOS, foundationCheckpoints, runFoundationDemo } from './foundation-demo-model'

describe('foundation lesson demos', () => {
  it('executes every fixture and solution before checkpoints pass', async () => {
    const traces = await Promise.all(FOUNDATION_DEMOS.map(runFoundationDemo))
    for (const trace of traces) {
      const checkpoints = foundationCheckpoints(trace, trace.frames.at(-1)!)

      expect(trace.frames.length, trace.demoId).toBeGreaterThan(1)
      expect(
        checkpoints.every(({ passed }) => passed),
        trace.demoId,
      ).toBe(true)
    }
  })

  it('builds response, replay, and M0 frames from workshop output', async () => {
    const response = await runFoundationDemo('response')
    expect(response.frames.map(({ event }) => JSON.parse(event).phase)).toEqual([
      'waiting',
      'completed',
    ])
    expect(response.frames.at(-1)?.visible).toBe(STATIC_CHAT_FIXTURE.reply)
    expect(response.expectedVisible).toBe(STATIC_CHAT_FIXTURE.reply)

    const replay = await runFoundationDemo('replay')
    expect(replay.expectedVisible).toBe(REPLAY_FIXTURE.chunks.join(''))
    expect(replay.frames.at(-1)?.visible).toBe(REPLAY_FIXTURE.chunks.join(''))

    const renderer = createM0Renderer()
    const actualSnapshots = M0_FIXTURE.chunks.map((chunk) => renderer.push(chunk))
    const m0 = await runFoundationDemo('m0')
    const demoSnapshots = m0.frames.map(({ event }) => JSON.parse(event))
    expect(demoSnapshots).toEqual(actualSnapshots)
  })

  it('builds UTF-8 and SSE frames from protocol solutions', async () => {
    const utf8 = await runFoundationDemo('utf8')
    expect(utf8.frames.at(-1)?.visible).toBe(decodeUtf8Chunks(UTF8_FIXTURE_CHUNKS))
    expect(utf8.expectedVisible).toBe(UTF8_FIXTURE_TEXT)
    expect(
      decodeUtf8Steps(UTF8_FIXTURE_CHUNKS)
        .slice(0, 2)
        .map(({ visible }) => visible),
    ).toEqual(['', ''])
    expect(utf8.frames.every(({ visible }) => !visible.includes('\uFFFD'))).toBe(true)

    const sse = await runFoundationDemo('sse')
    const actual = parseEventStream(SSE_FIXTURE_CHUNKS)
    expect(JSON.parse(sse.frames.at(-1)!.event)).toEqual(actual)
    expect(sse.frames.at(-1)?.visible).toBe(actual.events.map(({ data }) => data).join('\n\n'))
  })

  it('builds Chat adapter frames from typed solution events', async () => {
    const parsed = parseChatStream(CHAT_COMPLETIONS_FIXTURE_CHUNKS)
    const actual = adaptChatCompletions(parsed.events)
    const trace = await runFoundationDemo('chat-adapter')

    expect(trace.frames.slice(1).map(({ event }) => JSON.parse(event))).toEqual(actual)
    expect(trace.frames.at(-1)?.visible).toBe(
      actual
        .filter((event) => event.kind === 'content-delta')
        .map((event) => ('text' in event ? event.text : ''))
        .join(''),
    )
  })

  it('fails checkpoints when the executed output violates its proof', async () => {
    const trace = await runFoundationDemo('sse')
    const invalidTrace = { ...trace, actualEventCount: trace.actualEventCount + 1 }
    const checkpoints = foundationCheckpoints(invalidTrace, trace.frames.at(-1)!)

    expect(checkpoints.find(({ id }) => id === 'solution-output')?.passed).toBe(false)
    expect(checkpoints.some(({ passed }) => passed)).toBe(true)
  })
})
