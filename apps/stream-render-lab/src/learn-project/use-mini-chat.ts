import { useEffect, useRef, useState } from 'react'

import { readAnswer } from './read-answer'

export interface Turn {
  id: number
  prompt: string
  text: string
  status: string
}

export function useMiniChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState({ reads: 0, bytes: 0, first: 0 })
  const active = useRef<AbortController | null>(null)
  const sequence = useRef(0)
  useEffect(
    () => () => {
      sequence.current++
      active.current?.abort()
    },
    [],
  )

  const send = async (prompt: string, mode: string) => {
    if (!prompt.trim()) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const id = ++sequence.current
    let text = ''
    let reads = 0
    let bytes = 0
    let first = 0
    let frame: number | undefined
    const started = performance.now()
    const current = () => sequence.current === id
    const publish = (status = '接收中') => {
      if (!current()) return
      setTurns((previous) =>
        previous.map((turn) => (turn.id === id ? { ...turn, text, status } : turn)),
      )
      setStats({ reads, bytes, first })
    }
    setTurns((previous) => [...previous, { id, prompt, text: '', status: '等待第一段' }])
    setStats({ reads: 0, bytes: 0, first: 0 })
    setBusy(true)
    try {
      const response = await fetch(`/api/teaching?mode=${encodeURIComponent(mode)}`, {
        signal: controller.signal,
      })
      const outcome = await readAnswer(response, {
        signal: controller.signal,
        onBytes(size) {
          reads++
          bytes += size
        },
        onText(delta) {
          if (!current()) return
          if (!first) first = Math.round(performance.now() - started)
          text += delta
          if (frame === undefined)
            frame = requestAnimationFrame(() => {
              frame = undefined
              publish()
            })
        },
      })
      const labels = {
        completed: '已完成',
        incomplete: '内容不完整',
        truncated: '连接中断，保留已收内容',
        cancelled: '已停止',
        failed: '协议或服务出错',
      }
      publish(labels[outcome.kind])
    } catch (error) {
      publish(
        controller.signal.aborted
          ? '已停止，保留已收内容'
          : error instanceof Error
            ? error.message
            : '请求失败',
      )
    } finally {
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (current()) {
        setBusy(false)
        active.current = null
      }
    }
  }
  return { turns, busy, stats, send, stop: () => active.current?.abort() }
}
