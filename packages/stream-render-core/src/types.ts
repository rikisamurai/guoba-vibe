export type StreamStatus = 'streaming' | 'draining' | 'final' | 'cancelled' | 'error'

export interface StreamMessage {
  /** 模型原文，append-only，永不被渲染修补污染 */
  rawText: string
  /** 已放出给用户可见的前缀 */
  visibleText: string
  status: StreamStatus
}
