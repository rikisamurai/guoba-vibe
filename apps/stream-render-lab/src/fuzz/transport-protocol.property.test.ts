import {
  array,
  assert as check,
  asyncProperty,
  boolean,
  constantFrom,
  integer,
  option,
  record,
  type Arbitrary,
} from 'fast-check'
import { describe, expect, it } from 'vitest'

import chatWire from '../protocol/fixtures/chat-completions.sse?raw'
import { adaptProtocolStream } from '../protocol/protocol-stream'
import { parseSse, type SseMessageEvent } from '../protocol/sse'
import {
  collect,
  fromArray,
  PARTITION_WIDTHS,
  partitionBytes,
  PROPERTY_RUNS,
} from './property-helpers'

const encoder = new TextEncoder()
const widthsArbitrary = array(integer({ min: 1, max: 23 }), PARTITION_WIDTHS)
const unicodeTextArbitrary = array(
  constantFrom('a', 'Z', ' ', '\t', '0', '你', '界', '🙂', '🚀', 'é', '\u0301'),
  { minLength: 0, maxLength: 50 },
).map((characters) => characters.join(''))

const fieldTextArbitrary = array(constantFrom('a', 'b', '0', ' ', ':', '你', '🙂'), {
  minLength: 0,
  maxLength: 12,
}).map((characters) => characters.join(''))

interface MessageCase {
  data: string[]
  event?: string
  id?: string
}

const messageArbitrary: Arbitrary<MessageCase> = record({
  data: array(fieldTextArbitrary, { minLength: 1, maxLength: 3 }),
  event: option(fieldTextArbitrary.filter(Boolean), { nil: undefined }),
  id: option(fieldTextArbitrary, { nil: undefined }),
})

describe('stream transport partition properties', () => {
  it('preserves Unicode data across arbitrary byte partitions', async () => {
    await check(
      asyncProperty(unicodeTextArbitrary, widthsArbitrary, async (text, widths) => {
        const wire = encoder.encode(`data: ${text}\n\n`)
        const events = await collect(parseSse(fromArray(partitionBytes(wire, widths))))
        expect(events).toEqual([{ data: text }])
      }),
      { seed: 0x51_00_01, numRuns: PROPERTY_RUNS },
    )
  })

  it('is invariant to SSE chunk partitions and line endings', async () => {
    await check(
      asyncProperty(
        array(messageArbitrary, { minLength: 1, maxLength: 5 }),
        constantFrom('\n', '\r', '\r\n'),
        boolean(),
        widthsArbitrary,
        async (messages, lineEnding, withBom, widths) => {
          const { wire, expected } = serializeMessages(messages, lineEnding, withBom)
          const chunks = partitionBytes(encoder.encode(wire), widths)
          await expect(collect(parseSse(fromArray(chunks)))).resolves.toEqual(expected)
        },
      ),
      { seed: 0x51_00_02, numRuns: PROPERTY_RUNS },
    )
  })

  it('keeps Chat adapter events identical across arbitrary wire partitions', async () => {
    const bytes = encoder.encode(chatWire)
    const expected = await collect(adaptProtocolStream('chat-completions', fromArray([bytes])))

    await check(
      asyncProperty(widthsArbitrary, async (widths) => {
        const chunks = partitionBytes(bytes, widths)
        const actual = await collect(adaptProtocolStream('chat-completions', fromArray(chunks)))
        expect(actual).toEqual(expected)
      }),
      { seed: 0x51_00_03, numRuns: PROPERTY_RUNS },
    )
  })
})

function serializeMessages(
  messages: readonly MessageCase[],
  lineEnding: string,
  withBom: boolean,
): { wire: string; expected: SseMessageEvent[] } {
  let wire = withBom ? '\uFEFF' : ''
  let lastId: string | undefined
  const expected: SseMessageEvent[] = []

  for (const message of messages) {
    wire += `: heartbeat${lineEnding}`
    if (message.event !== undefined) wire += `event: ${message.event}${lineEnding}`
    if (message.id !== undefined) {
      wire += `id: ${message.id}${lineEnding}`
      lastId = message.id
    }
    for (const line of message.data) wire += `data: ${line}${lineEnding}`
    wire += `unknown: ignored${lineEnding}${lineEnding}`

    expected.push({
      data: message.data.join('\n'),
      ...(message.event ? { event: message.event } : {}),
      ...(lastId !== undefined ? { id: lastId } : {}),
    })
  }
  return { wire, expected }
}
