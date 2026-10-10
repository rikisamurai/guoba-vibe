import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createHeavyGate } from './heavy-gate'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('debounces rapid pushes and renders only the latest source', async () => {
  const render = vi.fn().mockResolvedValue('<svg>ok</svg>')
  const onSuccess = vi.fn()
  const gate = createHeavyGate({ delayMs: 300, render, onSuccess })
  gate.push('a')
  vi.advanceTimersByTime(100)
  gate.push('ab')
  vi.advanceTimersByTime(100)
  gate.push('abc')
  vi.advanceTimersByTime(300)
  await vi.runAllTimersAsync()
  expect(render).toHaveBeenCalledOnce()
  expect(render).toHaveBeenCalledWith('abc', 1)
  expect(onSuccess).toHaveBeenCalledWith('<svg>ok</svg>')
})

test('a failed attempt keeps the last successful output', async () => {
  const render = vi
    .fn()
    .mockResolvedValueOnce('<svg>good</svg>')
    .mockRejectedValueOnce(new Error('parse error'))
  const onSuccess = vi.fn()
  const gate = createHeavyGate({ delayMs: 300, render, onSuccess })
  gate.push('good')
  await vi.advanceTimersByTimeAsync(300)
  expect(onSuccess).toHaveBeenCalledTimes(1)
  gate.push('good but now broken')
  await vi.advanceTimersByTimeAsync(300)
  expect(render).toHaveBeenCalledTimes(2)
  expect(onSuccess).toHaveBeenCalledTimes(1) // failure swallowed, no update
})

test('attempt counter increments per render for unique DOM ids', async () => {
  const render = vi.fn().mockResolvedValue('x')
  const gate = createHeavyGate({ delayMs: 100, render, onSuccess: () => {} })
  gate.push('one')
  await vi.advanceTimersByTimeAsync(100)
  gate.push('two')
  await vi.advanceTimersByTimeAsync(100)
  expect(render.mock.calls.map((call) => call[1])).toEqual([1, 2])
})

test('a push landing mid-render triggers a follow-up with the newer source', async () => {
  let resolveFirst: ((value: string) => void) | undefined
  const render = vi
    .fn()
    .mockImplementationOnce(() => new Promise<string>((resolve) => (resolveFirst = resolve)))
    .mockResolvedValue('second')
  const onSuccess = vi.fn()
  const gate = createHeavyGate({ delayMs: 100, render, onSuccess })
  gate.push('one')
  await vi.advanceTimersByTimeAsync(100)
  gate.push('two')
  await vi.advanceTimersByTimeAsync(100) // debounce fires while render 1 in flight
  resolveFirst?.('first')
  await vi.runAllTimersAsync()
  expect(render).toHaveBeenCalledTimes(2)
  expect(render.mock.calls[1][0]).toBe('two')
})

test('dispose cancels pending work and blocks late success', async () => {
  const render = vi.fn().mockResolvedValue('late')
  const onSuccess = vi.fn()
  const gate = createHeavyGate({ delayMs: 100, render, onSuccess })
  gate.push('x')
  gate.dispose()
  await vi.runAllTimersAsync()
  expect(render).not.toHaveBeenCalled()
  expect(onSuccess).not.toHaveBeenCalled()
})

test('flush renders immediately without waiting for the delay', async () => {
  const render = vi.fn().mockResolvedValue('now')
  const onSuccess = vi.fn()
  const gate = createHeavyGate({ delayMs: 5000, render, onSuccess })
  gate.push('final source')
  gate.flush()
  await vi.runAllTimersAsync()
  expect(render).toHaveBeenCalledWith('final source', 1)
  expect(onSuccess).toHaveBeenCalledWith('now')
})
