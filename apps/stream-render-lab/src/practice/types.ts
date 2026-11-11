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
export interface PreviewRepair {
  text: string
  synthetic: string
}
export interface PreviewBlock {
  raw: string
  start: number
  node: unknown
}
export interface ParsedBlockInfo {
  type: string
  hasDefinition?: boolean
}
export interface TaskGate {
  push(source: string): void
  dispose(): void
}
export interface Implementation extends Pipeline {
  readAnswer(response: Response, options: ReadAnswerOptions): Promise<RunOutcome>
  createPublisher(show: (text: string) => void, clock: FrameClock): Publisher
  repairPreview(raw: string): PreviewRepair
  reuseBlocks(previous: PreviewBlock[], next: PreviewBlock[]): PreviewBlock[]
  dirtyBlockIndex(previous: ParsedBlockInfo[]): number | null
  createTaskGate<T>(render: (source: string) => Promise<T>, commit: (output: T) => void): TaskGate
}
export type ImplementationSource = 'mine' | 'reference'
