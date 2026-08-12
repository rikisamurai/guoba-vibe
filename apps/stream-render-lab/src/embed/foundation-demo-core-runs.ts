import { STATIC_CHAT_FIXTURE } from '../../workshop/mini-chat/01-static-chat/fixture'
import { createStaticChat } from '../../workshop/mini-chat/01-static-chat/solution/index'
import { REPLAY_FIXTURE } from '../../workshop/mini-chat/02-replay-clock/fixture'
import {
  createVirtualClock,
  replayText,
} from '../../workshop/mini-chat/02-replay-clock/solution/index'
import { M0_FIXTURE } from '../../workshop/mini-chat/03-m0-baseline/fixture'
import { createM0Renderer } from '../../workshop/mini-chat/03-m0-baseline/solution/index'
import type { FoundationDemoId, FoundationFrame, FoundationTrace } from './foundation-demo-model'

type CoreDemoId = Extract<FoundationDemoId, 'm0' | 'replay' | 'response'>

export function runCoreFoundationDemo(demoId: CoreDemoId): FoundationTrace {
  if (demoId === 'response') return runResponse()
  if (demoId === 'replay') return runReplay()
  return runM0()
}

function runResponse(): FoundationTrace {
  const chat = createStaticChat(STATIC_CHAT_FIXTURE)
  const assistant = chat.messages.find((message) => message.role === 'assistant')
  const visible = assistant?.text ?? ''
  const expectedVisible = STATIC_CHAT_FIXTURE.reply
  const frames: FoundationFrame[] = [
    {
      arrival: 'createStaticChat(fixture)',
      event: 'assistant is not available yet',
      note: '输入来自 01-static-chat/fixture，第一帧只显示请求。',
      visible: '',
      wire: JSON.stringify({ prompt: STATIC_CHAT_FIXTURE.prompt }),
    },
    {
      arrival: `${chat.messages.length} messages returned`,
      event: JSON.stringify(assistant ?? null),
      note: '最终帧直接读取 createStaticChat solution 的 assistant message。',
      visible,
      wire: JSON.stringify(STATIC_CHAT_FIXTURE),
    },
  ]
  const expectedMessages = [
    { role: 'user', text: STATIC_CHAT_FIXTURE.prompt },
    { role: 'assistant', text: STATIC_CHAT_FIXTURE.reply },
  ]
  return {
    actualEventCount: chat.messages.length,
    actualProof: JSON.stringify(chat.messages),
    demoId: 'response',
    expectedEventCount: expectedMessages.length,
    expectedProof: JSON.stringify(expectedMessages),
    expectedVisible,
    frames,
    proofLabel: 'Static Chat solution 产出 fixture 约定的完整回复',
    terminalObserved: assistant !== undefined,
  }
}

function runReplay(): FoundationTrace {
  const clock = createVirtualClock()
  const frames: FoundationFrame[] = [
    {
      arrival: `t=${clock.now()}ms`,
      event: 'replayText waiting for VirtualClock',
      note: '不推进 clock，就不应出现 delta。',
      visible: '',
      wire: JSON.stringify(REPLAY_FIXTURE.chunks),
    },
  ]
  let visible = ''
  let deltaCount = 0
  void replayText({
    ...REPLAY_FIXTURE,
    clock,
    onDelta(delta) {
      deltaCount += 1
      visible += delta
      frames.push({
        arrival: `t=${clock.now()}ms · delta ${deltaCount}`,
        event: `onDelta(${JSON.stringify(delta)})`,
        note: '帧由 replayText 的真实 callback 产生。',
        visible,
        wire: JSON.stringify(delta),
      })
    },
  })
  for (let index = 0; index < REPLAY_FIXTURE.chunks.length; index += 1) {
    clock.advanceBy(REPLAY_FIXTURE.intervalMs)
  }
  const expectedVisible = REPLAY_FIXTURE.chunks.join('')
  return {
    actualEventCount: deltaCount,
    actualProof: visible,
    demoId: 'replay',
    expectedEventCount: REPLAY_FIXTURE.chunks.length,
    expectedProof: expectedVisible,
    expectedVisible,
    frames,
    proofLabel: 'Replay solution 按 fixture 顺序交付全部 delta',
    terminalObserved: deltaCount === REPLAY_FIXTURE.chunks.length,
  }
}

function runM0(): FoundationTrace {
  const renderer = createM0Renderer()
  const frames = M0_FIXTURE.chunks.map((delta, index) => {
    const snapshot = renderer.push(delta)
    return {
      arrival: `push ${index + 1}/${M0_FIXTURE.chunks.length}`,
      event: JSON.stringify(snapshot),
      note: `createM0Renderer 已执行 ${snapshot.parseCount} 次全文 parse。`,
      visible: snapshot.visible,
      wire: snapshot.raw,
    }
  })
  const final = renderer.snapshot()
  const expectedRaw = M0_FIXTURE.chunks.join('')
  const expectedVisible = expectedRaw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return {
    actualEventCount: final.parseCount,
    actualProof: JSON.stringify({ raw: final.raw, visible: final.visible }),
    demoId: 'm0',
    expectedEventCount: M0_FIXTURE.chunks.length,
    expectedProof: JSON.stringify({ raw: expectedRaw, visible: expectedVisible }),
    expectedVisible,
    frames,
    proofLabel: 'M0 solution 的 raw、visible 与 parseCount 同时满足 contract',
    terminalObserved: final.parseCount === M0_FIXTURE.chunks.length,
  }
}
