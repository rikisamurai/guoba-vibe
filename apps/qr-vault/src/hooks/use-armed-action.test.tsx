import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useArmedAction } from '@/hooks/use-armed-action'

const roots: Root[] = []
const containers: HTMLElement[] = []

function ArmedActionProbe({ timeoutMs = 3000 }: { timeoutMs?: number }) {
  const { armedId, durationMs, arm } = useArmedAction(timeoutMs)

  return (
    <>
      <output data-armed-id>{armedId}</output>
      <output data-duration>{durationMs}</output>
      <button type="button" onClick={() => arm('qr-1')}>
        Arm
      </button>
      <button type="button" data-armed-for="qr-1">
        Confirm
      </button>
    </>
  )
}

function renderProbe(timeoutMs?: number) {
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)

  const root = createRoot(container)
  roots.push(root)
  act(() => root.render(<ArmedActionProbe timeoutMs={timeoutMs} />))

  const click = (selector: string) => {
    const element = container.querySelector<HTMLButtonElement>(selector)
    if (!element) throw new Error(`Missing element: ${selector}`)
    act(() => element.click())
  }

  return { container, click }
}

describe('useArmedAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    for (const root of roots.splice(0)) act(() => root.unmount())
    for (const container of containers.splice(0)) container.remove()
    vi.useRealTimers()
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: false,
    })
  })

  it('arms a target and exposes the countdown duration', () => {
    const { container, click } = renderProbe(2400)

    expect(container.querySelector('[data-duration]')?.textContent).toBe('2400')
    click('button:first-of-type')

    expect(container.querySelector('[data-armed-id]')?.textContent).toBe('qr-1')
  })

  it('cancels when the document receives an outside click', () => {
    const { container, click } = renderProbe()
    click('button:first-of-type')
    act(() => {
      vi.advanceTimersByTime(0)
    })

    act(() => document.body.click())

    expect(container.querySelector('[data-armed-id]')?.textContent).toBe('')
  })

  it('automatically cancels after three seconds', () => {
    const { container, click } = renderProbe()
    click('button:first-of-type')

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(container.querySelector('[data-armed-id]')?.textContent).toBe('qr-1')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(container.querySelector('[data-armed-id]')?.textContent).toBe('')
  })
})
