import { describe, expect, it, vi } from 'vitest'

import { VirtualClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import { EMPTY_HEAVY_METRICS } from '../engine/metrics'
import type { HeavyArtifact } from '../heavy/types'
import { implementations } from '../practice/implementations'
import { fixtureResponse, teachingPacket } from '../practice/lifecycle-checks'
import { createPublisher } from '../reference-chat/publish'
import { createTextSource } from './text-source'

describe('accepted text reaches the rendering engine before stop settles', () => {
  it.each(['M0', 'M1', 'M3', 'M4'] as const)(
    'preserves the pending last frame under %s',
    async (profile) => {
      const clock = new VirtualClock()
      const bridge = createTextSource()
      const run = createStreamingRenderEngine({ clock }).start({
        source: bridge.source,
        profile,
        reveal: 'direct',
        trace: 'off',
      })
      let nextId = 0
      const frames = new Map<number, () => void>()
      let published = 0
      const publisher = createPublisher(
        (value) => {
          bridge.append(value.slice(published))
          published = value.length
        },
        {
          request(task) {
            const id = ++nextId
            frames.set(id, task)
            return id
          },
          cancel(id) {
            frames.delete(id)
          },
        },
      )
      publisher.push('已收到')
      publisher.push('已收到最后一段🙂')
      publisher.finish()
      bridge.end({ kind: 'cancelled', by: 'user' })
      bridge.append('不应追加')
      await vi.waitFor(
        () => {
          clock.advanceFrame()
          expect(run.state.getSnapshot().phase).toBe('settled')
        },
        { interval: 1 },
      )
      const result = await run.settled
      expect(result.outcome.kind).toBe('cancelled')
      expect(result.snapshot.parts[0]?.raw).toBe('已收到最后一段🙂')
      expect(result.snapshot.parts[0]?.visible).toBe('已收到最后一段🙂')
      expect(result.snapshot.parts[0]?.document.raw).toBe('已收到最后一段🙂')
      expect(frames.size).toBe(0)
    },
  )

  it('stops inside a coalesced read before publishing its next SSE event', async () => {
    const controller = new AbortController()
    const body = new TextEncoder().encode(teachingPacket + teachingPacket + 'data: [DONE]\n\n')
    let text = ''
    await expect(
      implementations.reference.readAnswer(fixtureResponse([body]), {
        signal: controller.signal,
        onText(delta) {
          text += delta
          controller.abort()
        },
      }),
    ).rejects.toThrow()
    expect(text).toBe('你好')
  })

  it('can cancel pending enhancements after canonical has accepted the whole queue', async () => {
    const clock = new VirtualClock()
    const bridge = createTextSource()
    const cancel = vi.fn()
    const run = createStreamingRenderEngine({
      clock,
      createHeavyCoordinator: () => ({
        reconcile() {},
        finalize: () => new Promise<HeavyArtifact[]>(() => {}),
        inspect: () => ({ ...EMPTY_HEAVY_METRICS }),
        cancel,
      }),
    }).start({ source: bridge.source, profile: 'M4', reveal: 'direct', trace: 'off' })
    bridge.append('已经收到的最后一段')
    bridge.end({ kind: 'completed', reason: 'done' })
    await vi.waitFor(
      () => {
        clock.advanceFrame()
        expect(run.state.getSnapshot().phase).toBe('settling')
      },
      { interval: 1 },
    )
    run.cancel()
    const { snapshot, outcome } = await run.settled
    expect(cancel).toHaveBeenCalled()
    expect(outcome.kind).toBe('completed')
    expect(snapshot.parts[0]?.document.raw).toBe('已经收到的最后一段')
  })
})
