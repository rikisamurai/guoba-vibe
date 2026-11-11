import type { ChatSnapshot } from '../../workshop/mini-chat/01-static-chat/contract'
import { STATIC_CHAT_FIXTURE } from '../../workshop/mini-chat/01-static-chat/fixture'
import { sendNonStreamingTurn } from '../../workshop/mini-chat/01-static-chat/solution/index'
import { REPLAY_FIXTURE } from '../../workshop/mini-chat/02-replay-clock/fixture'
import {
  createVirtualClock,
  replayText,
} from '../../workshop/mini-chat/02-replay-clock/solution/index'
import { M0_FIXTURE } from '../../workshop/mini-chat/03-m0-baseline/fixture'
import { createM0Renderer } from '../../workshop/mini-chat/03-m0-baseline/solution/index'
import type { FoundationDemoId, FoundationFrame, FoundationTrace } from './foundation-demo-model'

type CoreDemoId = Extract<FoundationDemoId, 'm0' | 'replay' | 'response'>

export async function runCoreFoundationDemo(demoId: CoreDemoId): Promise<FoundationTrace> {
  if (demoId === 'response') return runResponse()
  if (demoId === 'replay') return runReplay()
  return runM0()
}

async function runResponse(): Promise<FoundationTrace> {
  const snapshots: ChatSnapshot[] = []
  const frames: FoundationFrame[] = []

  await sendNonStreamingTurn({
    prompt: STATIC_CHAT_FIXTURE.prompt,
    async complete() {
      return STATIC_CHAT_FIXTURE.reply
    },
    publish(snapshot) {
      snapshots.push(snapshot)
      frames.push(responseFrame(snapshot, frames.length + 1))
    },
  })

  const expectedVisible = STATIC_CHAT_FIXTURE.reply
  const expectedSnapshots: ChatSnapshot[] = [
    {
      phase: 'waiting',
      messages: [{ role: 'user', text: STATIC_CHAT_FIXTURE.prompt }],
    },
    {
      phase: 'completed',
      messages: [
        { role: 'user', text: STATIC_CHAT_FIXTURE.prompt },
        { role: 'assistant', text: STATIC_CHAT_FIXTURE.reply },
      ],
    },
  ]
  return {
    actualEventCount: snapshots.length,
    actualProof: JSON.stringify(snapshots),
    demoId: 'response',
    expectedEventCount: expectedSnapshots.length,
    expectedProof: JSON.stringify(expectedSnapshots),
    expectedVisible,
    frames,
    proofLabel: '非流式 Chat 先进入 waiting，再一次发布完整回复',
    terminalObserved: snapshots.at(-1)?.phase === 'completed',
  }
}

function responseFrame(snapshot: ChatSnapshot, publishCount: number): FoundationFrame {
  const assistant = snapshot.messages.find((message) => message.role === 'assistant')
  return {
    arrival: `publish ${publishCount} · ${snapshot.phase}`,
    event: JSON.stringify(snapshot),
    note:
      snapshot.phase === 'waiting'
        ? '用户消息已同步发布，完整回复仍在等待 Promise。'
        : 'Promise resolve 后，assistant 回复只发布一次。',
    visible: assistant?.text ?? '',
    wire:
      snapshot.phase === 'waiting'
        ? JSON.stringify({ prompt: STATIC_CHAT_FIXTURE.prompt })
        : JSON.stringify({ reply: assistant?.text ?? '' }),
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
