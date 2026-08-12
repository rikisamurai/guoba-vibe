import { expect, it } from 'vitest'

import { defineStep01Contract, type Step01Api } from '../01-static-chat/contract'
import { REPLAY_FIXTURE } from './fixture'

export interface VirtualClock {
  now(): number
  after(ms: number, task: () => void): void
  advanceBy(ms: number): void
}

export interface ReplayInput {
  chunks: readonly string[]
  intervalMs: number
  clock: VirtualClock
  onDelta(delta: string): void
}

export interface Step02Api extends Step01Api {
  createVirtualClock(): VirtualClock
  replayText(input: ReplayInput): Promise<void>
}

export function defineStep02Contract(api: Step02Api): void {
  defineStep01Contract(api)

  it('02 replays text only when virtual time advances', async () => {
    const clock = api.createVirtualClock()
    const visible: string[] = []
    let text = ''
    const settled = api.replayText({
      ...REPLAY_FIXTURE,
      clock,
      onDelta(delta) {
        text += delta
        visible.push(`${clock.now()}:${text}`)
      },
    })

    expect(visible).toEqual([])
    clock.advanceBy(7)
    expect(visible).toEqual([])
    clock.advanceBy(1)
    expect(visible).toEqual(['8:边'])
    clock.advanceBy(24)
    await settled
    expect(visible).toEqual(['8:边', '16:边到达', '24:边到达，边', '32:边到达，边显示。'])
  })
}
