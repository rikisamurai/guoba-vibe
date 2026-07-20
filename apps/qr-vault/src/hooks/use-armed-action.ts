import { useEffect, useState } from 'react'

type ArmedAction = {
  /** Id of the currently armed target, or '' when nothing is armed. */
  armedId: string
  /** Timeout window for the visual countdown and automatic cancellation. */
  durationMs: number
  arm: (id: string) => void
  cancel: () => void
}

/**
 * Two-step "armed" confirmation shared by delete buttons. Arms a target id,
 * auto-cancels after `timeoutMs` or on an outside click. Confirm buttons must
 * carry `data-armed-for={id}` so the outside-click guard can skip them.
 */
export function useArmedAction(timeoutMs = 3000): ArmedAction {
  const [armedId, setArmedId] = useState('')

  useEffect(() => {
    if (!armedId) return

    function onDocClick(event: MouseEvent) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DOM event target is EventTarget; narrowing to HTMLElement to call closest()
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedId}"]`)) return
      setArmedId('')
    }
    const attach = window.setTimeout(() => document.addEventListener('click', onDocClick), 0)
    const autoCancel = window.setTimeout(() => setArmedId(''), timeoutMs)

    return () => {
      window.clearTimeout(attach)
      window.clearTimeout(autoCancel)
      document.removeEventListener('click', onDocClick)
    }
  }, [armedId, timeoutMs])

  return { armedId, durationMs: timeoutMs, arm: setArmedId, cancel: () => setArmedId('') }
}
