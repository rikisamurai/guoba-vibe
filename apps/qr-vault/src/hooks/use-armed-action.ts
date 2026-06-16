import { useEffect, useState } from 'react'

type ArmedAction = {
  /** Id of the currently armed target, or '' when nothing is armed. */
  armedId: string
  /** Countdown from 1 to 0 across the timeout window, for a visual indicator. */
  progress: number
  arm: (id: string) => void
  cancel: () => void
}

/**
 * Two-step "armed" confirmation shared by delete buttons. Arms a target id,
 * auto-cancels after `timeoutMs` or on an outside click, and exposes a
 * 1→0 progress value so callers can render a countdown. Confirm buttons must
 * carry `data-armed-for={id}` so the outside-click guard can skip them.
 */
export function useArmedAction(timeoutMs = 3000): ArmedAction {
  const [armedId, setArmedId] = useState('')
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    if (!armedId) return
    const start = Date.now()
    setProgress(1)

    function onDocClick(event: MouseEvent) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DOM event target is EventTarget; narrowing to HTMLElement to call closest()
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedId}"]`)) return
      setArmedId('')
    }
    const attach = window.setTimeout(() => document.addEventListener('click', onDocClick), 0)
    const tick = window.setInterval(() => {
      setProgress(Math.max(0, 1 - (Date.now() - start) / timeoutMs))
    }, 50)
    const autoCancel = window.setTimeout(() => setArmedId(''), timeoutMs)

    return () => {
      window.clearTimeout(attach)
      window.clearTimeout(autoCancel)
      window.clearInterval(tick)
      document.removeEventListener('click', onDocClick)
    }
  }, [armedId, timeoutMs])

  return { armedId, progress, arm: setArmedId, cancel: () => setArmedId('') }
}
