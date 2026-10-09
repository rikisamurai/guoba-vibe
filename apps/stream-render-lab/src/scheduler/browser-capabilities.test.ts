import { describe, expect, it, vi } from 'vitest'

import { createBrowserSchedulingCapabilities } from './browser-capabilities'

describe('createBrowserSchedulingCapabilities', () => {
  it('normalizes postTask cancellation and isInputPending options', () => {
    let postedTask: (() => void) | undefined
    let postedSignal: AbortSignal | undefined
    const work = vi.fn()
    const isInputPending = vi.fn(() => true)
    const capabilities = createBrowserSchedulingCapabilities({
      postTask: (task, options) => {
        postedTask = task
        postedSignal = options.signal
        return Promise.resolve()
      },
      isInputPending,
    })

    const cancel = capabilities.postTask?.(work)
    expect(postedSignal?.aborted).toBe(false)
    postedTask?.()
    expect(work).toHaveBeenCalledOnce()
    expect(capabilities.isInputPending?.()).toBe(true)
    expect(isInputPending).toHaveBeenCalledWith({ includeContinuous: true })

    cancel?.()
    expect(postedSignal?.aborted).toBe(true)
  })

  it('omits capabilities that the browser does not expose', () => {
    expect(createBrowserSchedulingCapabilities({})).toEqual({})
  })
})
