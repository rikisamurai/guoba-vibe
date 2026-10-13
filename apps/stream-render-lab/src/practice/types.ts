import type { RunOutcome } from '../protocol/types'

export interface ReadRecord {
  index: number
  bytes: number[]
  decoded: string
  events: string[]
  text: string[]
  eof?: boolean
}
export interface ReadAnswerOptions {
  signal: AbortSignal
  onText(text: string): void
  onBytes?(byteLength: number): void
  onRecord?(record: ReadRecord): void
}
export interface Decoder {
  push(bytes: Uint8Array): string
  finish(): string
}
export interface EventParser {
  push(text: string): string[]
  finish(): string[]
}
export interface EventResult {
  text?: string
  outcome?: RunOutcome
}
export interface Pipeline {
  createDecoder(): Decoder
  createEventParser(): EventParser
  createEventReader(): (data: string) => EventResult
}
export interface FrameClock {
  request(callback: () => void): number
  cancel(id: number): void
}
export interface Publisher {
  push(text: string): void
  finish(): void
  cancel(): void
}
export interface Implementation extends Pipeline {
  readAnswer(response: Response, options: ReadAnswerOptions): Promise<RunOutcome>
  createPublisher(show: (text: string) => void, clock: FrameClock): Publisher
}
export type ImplementationSource = 'mine' | 'reference'
