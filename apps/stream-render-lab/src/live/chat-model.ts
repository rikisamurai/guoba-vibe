import type { InspectionSnapshot, RenderSnapshot, RunResult } from '../engine/types'
import type { RunOutcome } from '../protocol'
import type { WireProtocol } from '../protocol'
import type { DeepSeekMessage } from './deepseek-source'

export const LIVE_STAGES = [
  'connecting',
  'headers',
  'first-byte',
  'reasoning',
  'content',
  'draining',
  'settled',
] as const

export type LiveStage = (typeof LIVE_STAGES)[number]

export interface LifecycleMark {
  stage: LiveStage
  atMs: number
  detail: string
}

export interface UserChatEntry {
  id: string
  role: 'user'
  content: string
}

export interface AssistantChatEntry {
  id: string
  role: 'assistant'
  model: string
  protocol: WireProtocol
  startedAt: number
  lifecycle: readonly LifecycleMark[]
  snapshot: RenderSnapshot
  inspection: InspectionSnapshot
  result?: RunResult
}

export type ChatEntry = UserChatEntry | AssistantChatEntry

export function appendLifecycle(
  marks: readonly LifecycleMark[],
  next: LifecycleMark,
): readonly LifecycleMark[] {
  if (marks.some((mark) => mark.stage === next.stage)) return marks
  return [...marks, next]
}

export function rawPart(entry: AssistantChatEntry, kind: 'answer' | 'reasoning'): string {
  return entry.snapshot.parts.find((part) => part.kind === kind)?.raw ?? ''
}

export function orderedRaw(entry: AssistantChatEntry): string {
  return entry.snapshot.parts.map((part) => part.raw).join('')
}

export function historyFrom(entries: readonly ChatEntry[]): DeepSeekMessage[] {
  const history: DeepSeekMessage[] = []
  for (const entry of entries) {
    if (entry.role === 'user') history.push({ role: 'user', content: entry.content })
    else {
      const answer = rawPart(entry, 'answer')
      if (answer !== '') history.push({ role: 'assistant', content: answer })
    }
  }
  return history.slice(-20)
}

export function outcomeLabel(outcome: RunOutcome | undefined): string {
  if (!outcome) return 'streaming'
  if (outcome.kind === 'failed') return outcome.failure.code ?? 'failed'
  if (outcome.kind === 'truncated') return `truncated · ${outcome.cause}`
  if (outcome.kind === 'cancelled') return `cancelled · ${outcome.by}`
  return `${outcome.kind} · ${outcome.reason}`
}

export function outcomeMessage(outcome: RunOutcome | undefined): string | null {
  if (!outcome || outcome.kind === 'completed') return null
  if (outcome.kind === 'failed') return outcome.failure.message
  if (outcome.kind === 'truncated') {
    return `连接在协议终态前${outcome.cause === 'eof' ? '结束' : '中断'}，已保留接收内容。`
  }
  if (outcome.kind === 'incomplete') return `Provider 返回不完整终态：${outcome.reason}`
  return '生成已由用户停止，已保留接收内容。'
}
