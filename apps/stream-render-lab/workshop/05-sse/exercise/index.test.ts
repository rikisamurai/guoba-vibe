import { it } from 'vitest'

import {
  assertEofContract,
  assertEventAssemblyContract,
  assertFieldParserContract,
  assertLineScannerContract,
  assertPartitionContract,
  assertUtf8DecoderContract,
} from '../contract'
import {
  createLessonDecoder,
  drainLessonLines,
  parseLessonField,
  parseLessonSse,
} from './parse-sse'

it('decodes BOM and a split UTF-8 code point', () => assertUtf8DecoderContract(createLessonDecoder))

it('scans LF, CR and CRLF without consuming a trailing CR early', () =>
  assertLineScannerContract(drainLessonLines))

it('parses the first field colon and ignores comments', () =>
  assertFieldParserContract(parseLessonField))

it('assembles event, data, id and retry fields from one wire', () =>
  assertEventAssemblyContract(parseLessonSse))

it('does not dispatch residual data at EOF', () => assertEofContract(parseLessonSse))

it('produces the same events for every-byte and after-CR partitions', () =>
  assertPartitionContract(parseLessonSse))
