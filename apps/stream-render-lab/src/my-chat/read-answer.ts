import { consumeResponse } from '../practice/consume-response'
import type { ReadAnswerOptions } from '../practice/types'
import type { RunOutcome } from '../protocol/types'
import { createDecoder } from './decode'
import { createEventParser } from './parse-events'
import { createEventReader } from './read-event'

// B1: A closed connection is not proof of a complete answer. Fix the EOF fallback.
export async function readAnswer(
  response: Response,
  options: ReadAnswerOptions,
): Promise<RunOutcome> {
  const outcome = await consumeResponse(response, options, {
    createDecoder,
    createEventParser,
    createEventReader,
  })
  return outcome ?? { kind: 'completed', reason: 'eof' }
}
