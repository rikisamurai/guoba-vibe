import { describe, expect, it, vi } from 'vitest'

import { BrowserClock, VirtualClock } from './clock'

describe('VirtualClock', () => {
  it('runs timers and frames deterministically in due-time order', () => {
    const clock = new VirtualClock({ frameDuration: 16 })
    const events: string[] = []

    clock.frame((time) => events.push(`frame:${time}`))
    clock.after(8, () => events.push(`timer:${clock.now()}`))
    clock.after(16, () => events.push(`same-time:${clock.now()}`))

    clock.advanceBy(8)
    expect(events).toEqual(['timer:8'])

    clock.advanceFrame()
    expect(events).toEqual(['timer:8', 'frame:16', 'same-time:16'])
    expect(clock.now()).toBe(16)
  })

  it('supports cancellation and drains work scheduled by work', () => {
    const clock = new VirtualClock()
    const events: string[] = []
    const cancel = clock.after(1, () => events.push('cancelled'))
    cancel()
    clock.after(2, () => {
      events.push('first')
      clock.after(1, () => events.push('second'))
    })

    clock.runUntilIdle()

    expect(events).toEqual(['first', 'second'])
    expect(clock.pendingCount).toBe(0)
  })

  it('bounds recursively scheduled zero-delay work', () => {
    const clock = new VirtualClock()
    const repeat = () => clock.after(0, repeat)
    clock.after(0, repeat)
    expect(() => clock.runUntilIdle(3)).toThrow('VirtualClock exceeded 3 tasks')
  })
})

describe('BrowserClock', () => {
  it('delegates frame, timer, now and cancellation to the browser runtime', () => {
    const cancelFrame = vi.fn()
    const clearTimer = vi.fn()
    const runtime = {
      now: () => 42,
      requestFrame: vi.fn(() => 7),
      cancelFrame,
      setTimer: vi.fn(() => 9),
      clearTimer,
    }
    const clock = new BrowserClock(runtime)

    const stopFrame = clock.frame(() => undefined)
    const stopTimer = clock.after(20, () => undefined)
    stopFrame()
    stopTimer()

    expect(clock.now()).toBe(42)
    expect(runtime.requestFrame).toHaveBeenCalledOnce()
    expect(runtime.setTimer).toHaveBeenCalledWith(expect.any(Function), 20)
    expect(cancelFrame).toHaveBeenCalledWith(7)
    expect(clearTimer).toHaveBeenCalledWith(9)
  })
})
