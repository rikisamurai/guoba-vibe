import { describe, expect, it } from 'vitest'

import { VirtualClock, type Cancel, type EngineClock } from '../engine/clock'
import {
  createAdaptiveFrameScheduler,
  type HostSchedulingCapabilities,
} from './adaptive-frame-scheduler'

class CostClock implements EngineClock {
  private consumed = 0
  private readonly clock = new VirtualClock()

  get pendingCount(): number {
    return this.clock.pendingCount
  }

  now(): number {
    return this.clock.now() + this.consumed
  }

  frame(task: (timestamp: number) => void): Cancel {
    return this.clock.frame(() => task(this.now()))
  }

  after(ms: number, task: () => void): Cancel {
    return this.clock.after(ms, task)
  }

  consume(ms: number): void {
    this.consumed += ms
  }

  advanceFrame(): void {
    this.clock.advanceFrame()
  }
}

class ControlledPostTaskHost {
  private queue: Array<{ cancelled: boolean; task: () => void }> = []

  readonly postTask: NonNullable<HostSchedulingCapabilities['postTask']> = (task) => {
    const entry = { cancelled: false, task }
    this.queue.push(entry)
    return () => {
      entry.cancelled = true
    }
  }

  get pendingCount(): number {
    return this.queue.filter((entry) => !entry.cancelled).length
  }

  runNext(): void {
    const entry = this.queue.shift()
    if (entry && !entry.cancelled) entry.task()
  }
}

describe('AdaptiveFrameScheduler', () => {
  it('falls back to the injected frame clock when postTask is unavailable', () => {
    const clock = new VirtualClock()
    const scheduler = createAdaptiveFrameScheduler({ clock })
    const events: string[] = []

    scheduler.schedule(() => events.push('first'))
    scheduler.schedule(() => events.push('second'))

    expect(events).toEqual([])
    clock.advanceFrame()
    expect(events).toEqual(['first', 'second'])
    expect(clock.pendingCount).toBe(0)
  })

  it('yields after cooperative work consumes the frame budget', () => {
    const clock = new CostClock()
    const scheduler = createAdaptiveFrameScheduler({ clock, frameBudgetMs: 5 })
    const events: string[] = []

    scheduler.schedule(() => {
      events.push('expensive')
      clock.consume(5)
    })
    scheduler.schedule(() => events.push('next'))

    clock.advanceFrame()
    expect(events).toEqual(['expensive'])
    expect(clock.pendingCount).toBe(1)

    clock.advanceFrame()
    expect(events).toEqual(['expensive', 'next'])
  })

  it('prefers postTask and yields for pending user input after making progress', () => {
    const clock = new VirtualClock()
    const host = new ControlledPostTaskHost()
    let inputPending = true
    const scheduler = createAdaptiveFrameScheduler({
      clock,
      capabilities: {
        postTask: host.postTask,
        isInputPending: () => inputPending,
      },
    })
    const events: string[] = []

    scheduler.schedule(() => events.push('first'))
    scheduler.schedule(() => events.push('second'))

    expect(clock.pendingCount).toBe(0)
    expect(host.pendingCount).toBe(1)
    host.runNext()
    expect(events).toEqual(['first'])
    expect(host.pendingCount).toBe(1)

    inputPending = false
    host.runNext()
    expect(events).toEqual(['first', 'second'])
  })

  it('cancels queued work and releases an empty fallback frame', () => {
    const clock = new VirtualClock()
    const scheduler = createAdaptiveFrameScheduler({ clock })
    const events: string[] = []

    const cancelOnlyTask = scheduler.schedule(() => events.push('cancelled'))
    expect(clock.pendingCount).toBe(1)
    cancelOnlyTask()
    expect(clock.pendingCount).toBe(0)

    scheduler.schedule(() => events.push('kept'))
    const cancelSecondTask = scheduler.schedule(() => events.push('also cancelled'))
    cancelSecondTask()
    clock.advanceFrame()

    expect(events).toEqual(['kept'])
    expect(clock.pendingCount).toBe(0)
  })

  it('keeps FIFO ordering when running work schedules more work', () => {
    const clock = new VirtualClock()
    const scheduler = createAdaptiveFrameScheduler({ clock })
    const events: string[] = []

    scheduler.schedule(() => {
      events.push('first')
      scheduler.schedule(() => events.push('third'))
    })
    scheduler.schedule(() => events.push('second'))

    clock.advanceFrame()
    expect(events).toEqual(['first', 'second', 'third'])
    expect(clock.pendingCount).toBe(0)
  })
})
