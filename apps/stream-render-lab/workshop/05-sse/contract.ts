import { expect } from 'vitest'

import type { SseEvent } from '../../src/protocol/sse'
import { CHAT_COMPLETIONS_WIRE } from './fixtures/chat-completions'

export type SseImplementation = (chunks: AsyncIterable<Uint8Array>) => Promise<SseEvent[]>

export interface LessonUtf8Decoder {
  push(chunk: Uint8Array): string
  finish(): string
}

export type Utf8DecoderFactory = () => LessonUtf8Decoder

export interface LineDrainResult {
  lines: string[]
  rest: string
}

export type LineScannerImplementation = (input: string, eof: boolean) => LineDrainResult

export interface ParsedSseField {
  name: string
  value: string
}

export type FieldParserImplementation = (line: string) => ParsedSseField | undefined

export function assertUtf8DecoderContract(createDecoder: Utf8DecoderFactory): void {
  const bytes = new TextEncoder().encode('\uFEFF\u4f60\ud83d\ude42')
  const decoder = createDecoder()
  let decoded = ''
  for (const byte of bytes) decoded += decoder.push(Uint8Array.of(byte))
  decoded += decoder.finish()
  expect(decoded).toBe('\u4f60\ud83d\ude42')
}

export function assertLineScannerContract(drainLines: LineScannerImplementation): void {
  expect(drainLines('alpha\r\nbeta\rgamma\ntail', false)).toEqual({
    lines: ['alpha', 'beta', 'gamma'],
    rest: 'tail',
  })
  expect(drainLines('held\r', false)).toEqual({ lines: [], rest: 'held\r' })
  expect(drainLines('held\r', true)).toEqual({ lines: ['held'], rest: '' })
}

export function assertFieldParserContract(parseField: FieldParserImplementation): void {
  expect(parseField(': heartbeat')).toBeUndefined()
  expect(parseField('data: https://example.test/a:b')).toEqual({
    name: 'data',
    value: 'https://example.test/a:b',
  })
  expect(parseField('id')).toEqual({ name: 'id', value: '' })
  expect(parseField('data:  keep-one-space')).toEqual({ name: 'data', value: ' keep-one-space' })
}

export async function assertEventAssemblyContract(parse: SseImplementation): Promise<void> {
  const bytes = new TextEncoder().encode(CHAT_COMPLETIONS_WIRE)
  await expect(parse(oneChunk(bytes))).resolves.toEqual(EXPECTED_EVENTS)
}

export async function assertEofContract(parse: SseImplementation): Promise<void> {
  const bytes = new TextEncoder().encode('data: must-not-dispatch')
  await expect(parse(oneChunk(bytes))).resolves.toEqual([])
}

export async function assertPartitionContract(parse: SseImplementation): Promise<void> {
  const bytes = new TextEncoder().encode(CHAT_COMPLETIONS_WIRE)
  const partitions = [everyByte(bytes), splitAfterCr(bytes)]
  for (const partition of partitions) {
    // oxlint-disable-next-line no-await-in-loop -- every partition must match the spec-derived events
    await expect(parse(partition)).resolves.toEqual(EXPECTED_EVENTS)
  }
}

export async function assertSseContract(parse: SseImplementation): Promise<void> {
  await assertEventAssemblyContract(parse)
  await assertEofContract(parse)
  await assertPartitionContract(parse)
}

const EXPECTED_EVENTS: readonly SseEvent[] = [
  { control: 'retry', retry: 900 },
  {
    event: 'delta',
    id: '7',
    data: '{"id":"lesson",\n"choices":[{"index":0,"delta":{"content":"你🙂"}}]}',
  },
  { id: '7', data: '[DONE]' },
]

async function* oneChunk(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  yield bytes
}

async function* everyByte(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  for (const byte of bytes) yield Uint8Array.of(byte)
}

async function* splitAfterCr(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  let start = 0
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x0d) continue
    yield bytes.slice(start, index + 1)
    start = index + 1
  }
  if (start < bytes.length) yield bytes.slice(start)
}
