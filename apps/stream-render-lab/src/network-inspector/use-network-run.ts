import { useEffect, useRef, useState } from 'react'

import { implementations } from '../practice/implementations'
import type { ReadRecord } from '../practice/types'

export type NetworkSource = 'mine' | 'reference'
export interface TimedRecord extends ReadRecord {
  receivedAt: number
}

export function useNetworkRun() {
  const [records, setRecords] = useState<TimedRecord[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('尚未请求')
  const [busy, setBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])

  const run = async (mode: string, source: NetworkSource) => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setRecords([])
    setText('')
    setBusy(true)
    setStatus('等待 HTTP 响应…')
    const started = performance.now()
    const current = () => active.current === controller && !controller.signal.aborted
    try {
      const response = await fetch(`/api/teaching?mode=${encodeURIComponent(mode)}`, {
        signal: controller.signal,
      })
      if (!current()) return
      setStatus(`HTTP ${response.status} · 正在读取`)
      const outcome = await implementations[source].readAnswer(response, {
        signal: controller.signal,
        onText(delta) {
          if (current()) setText((previous) => previous + delta)
        },
        onRecord(record) {
          if (current()) {
            const receivedAt = Math.round(performance.now() - started)
            setRecords((previous) => [...previous, { ...record, receivedAt }])
          }
        },
      })
      if (current()) {
        const reason =
          'reason' in outcome ? outcome.reason : 'cause' in outcome ? outcome.cause : ''
        setStatus(`当前实现判定：${outcome.kind}${reason ? ` · ${reason}` : ''}`)
      }
    } catch (error) {
      if (current()) setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      if (active.current === controller) {
        active.current = null
        setBusy(false)
      }
    }
  }

  const stop = () => {
    active.current?.abort()
    setBusy(false)
    setStatus('已停止 · 保留已接收正文')
  }
  const reset = () => {
    setRecords([])
    setText('')
    setStatus('尚未请求')
  }
  return { records, text, status, busy, run, stop, reset }
}
