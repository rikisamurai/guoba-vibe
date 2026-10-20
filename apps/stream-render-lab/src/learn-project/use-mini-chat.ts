import { useEffect, useRef, useState } from 'react'

import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun, RenderSnapshot } from '../engine/types'
import { myRenderPolicy } from '../my-chat/render-policy'
import { implementations } from '../practice/implementations'
import type { ImplementationSource } from '../practice/types'
import type { RunOutcome } from '../protocol/types'
import { createTextSource } from './text-source'

export interface Turn {
  id: number
  prompt: string
  text: string
  status: string
  source: ImplementationSource
  snapshot?: RenderSnapshot
}
export function useMiniChat(source: ImplementationSource) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState({ reads: 0, bytes: 0, first: 0 })
  const active = useRef<AbortController | null>(null)
  const renderRun = useRef<RenderRun | null>(null)
  const stopRendering = useRef<(() => void) | null>(null)
  const sequence = useRef(0)
  useEffect(
    () => () => {
      sequence.current++
      active.current?.abort()
      renderRun.current?.cancel('superseded')
    },
    [],
  )
  const send = async (prompt: string, mode: string) => {
    if (!prompt.trim()) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const id = ++sequence.current
    const implementation = implementations[source]
    const bridge = createTextSource()
    const run = createStreamingRenderEngine().start({
      source: bridge.source,
      profile: source === 'mine' ? myRenderPolicy.profile : 'M4',
      reveal: 'direct',
      trace: 'off',
    })
    renderRun.current = run
    let readingComplete = false
    let stopAfterDrain = false
    let text = '',
      reads = 0,
      bytes = 0,
      first = 0,
      published = 0
    let status = '等待第一段'
    const started = performance.now()
    const current = () => sequence.current === id
    const publish = () => {
      if (!current()) return
      if (stopAfterDrain && run.state.getSnapshot().phase === 'settling') run.cancel()
      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === id ? { ...turn, text, status, snapshot: run.state.getSnapshot() } : turn,
        ),
      )
      setStats({ reads, bytes, first })
    }
    stopRendering.current = () => {
      if (!readingComplete) return
      status = '已停止渲染，保留已收内容'
      stopAfterDrain = true
      // Wait for the queued accepted text to reach canonical before cancelling heavy work.
      publish()
    }
    const unsubscribe = run.state.subscribe(publish)
    const publisher = implementation.createPublisher(
      (value) => {
        bridge.append(value.slice(published))
        published = value.length
      },
      {
        request: (callback) => requestAnimationFrame(callback),
        cancel: (frame) => cancelAnimationFrame(frame),
      },
    )
    setTurns((previous) => [...previous, { id, prompt, text: '', status, source }])
    setStats({ reads: 0, bytes: 0, first: 0 })
    setBusy(true)
    let outcome: RunOutcome
    try {
      const response = await fetch(`/api/teaching?mode=${encodeURIComponent(mode)}`, {
        signal: controller.signal,
      })
      outcome = await implementation.readAnswer(response, {
        signal: controller.signal,
        onBytes(size) {
          reads++
          bytes += size
        },
        onText(delta) {
          if (!current()) return
          if (!first) first = Math.round(performance.now() - started)
          text += delta
          status = '接收中'
          publisher.push(text)
        },
      })
      const labels = {
        completed: '已完成',
        incomplete: '内容不完整',
        truncated: '连接中断，保留已收内容',
        cancelled: '已停止',
        failed: '协议或服务出错',
      }
      status = labels[outcome.kind]
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败'
      status = controller.signal.aborted ? '已停止，保留已收内容' : message
      outcome = controller.signal.aborted
        ? { kind: 'cancelled', by: 'user' }
        : { kind: 'failed', failure: { kind: 'transport', message } }
    }
    readingComplete = true
    try {
      publisher.finish()
      bridge.end(outcome)
      await run.settled
      publish()
    } finally {
      publisher.cancel()
      unsubscribe()
      if (current()) {
        setBusy(false)
        active.current = null
        renderRun.current = null
        stopRendering.current = null
      }
    }
  }
  return {
    turns,
    busy,
    stats,
    send,
    stop: () => {
      active.current?.abort()
      stopRendering.current?.()
    },
  }
}
