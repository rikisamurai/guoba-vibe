export type PartKind = 'answer' | 'reasoning' | 'tool-call' | 'tool-status' | 'citation'

export type PartDelta =
  | { kind: 'text'; text: string }
  | { kind: 'json'; fragment: string }
  | { kind: 'status'; value: string }

export interface StreamFailure {
  kind: 'protocol' | 'provider' | 'transport'
  message: string
  code?: string
}

export type RunOutcome =
  | { kind: 'completed'; reason: string }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'truncated'; cause: 'eof' | 'transport'; retryable: true }
  | { kind: 'cancelled'; by: 'user' | 'superseded' }
  | { kind: 'failed'; failure: StreamFailure }

export type StreamEvent =
  | { type: 'response.start'; responseId: string }
  | { type: 'part.start'; partId: string; kind: PartKind }
  | { type: 'part.delta'; partId: string; delta: PartDelta }
  | { type: 'part.end'; partId: string }
  | { type: 'response.end'; outcome: RunOutcome }
  | {
      type: 'diagnostic'
      level: 'info' | 'warning'
      code: string
      message: string
    }

export type EventOrigin =
  | {
      protocol: 'responses'
      sequenceNumber: number
      itemId?: string
      outputIndex?: number
      contentIndex?: number
    }
  | { protocol: 'chat-completions'; choiceIndex: number }
  | { protocol: 'anthropic'; blockIndex?: number }
  | { protocol: 'replay'; recordIndex: number }

export interface SourceEvent {
  sourceEventOrdinal: number
  splitIndex: number
  origin: EventOrigin
  event: StreamEvent
}

export interface InternalEnvelope extends SourceEvent {
  internalSeq: number
}
