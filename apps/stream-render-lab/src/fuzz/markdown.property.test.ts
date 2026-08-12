import { array, assert as check, constantFrom, integer, oneof, property } from 'fast-check'
import { describe, expect, it } from 'vitest'

import { normalizeRenderIr, parsePreview, type RenderDocument } from '../markdown'
import { partitionText, PROPERTY_RUNS } from './property-helpers'

const blockArbitrary = constantFrom(
  'plain paragraph',
  '# Heading',
  '**strong** and `inline code`',
  '> quoted\n> continuation',
  '- one\n- two',
  '| a | b |\n| - | - |\n| 1 | 2 |',
  '```ts\nconst value = 1\n```',
  '$$\nx^2 + y^2\n$$',
  '[inline link](https://example.test)',
)

const checkpointRichDocument = array(blockArbitrary, {
  minLength: 2,
  maxLength: 6,
}).map((blocks) => blocks.join('\n\n'))

const adversarialDocument = constantFrom(
  '# lead\n\n[x]\n\ntail\n\n[x]: /url',
  '# lead\n\n[x]\n\ntail\n\n> [x]: /inside',
  'heading\n---\n\n| a | b |\n| - | - |\n| 1 | 2 |',
  'intro\n\n- one\n- two\n\n- three',
  'intro\n\n> - nested\n>   continuation\n> lazy continuation',
  `intro\n\n\`\`\`ts\nconst value = 1\n\`\`\``,
)

const widthsArbitrary = array(integer({ min: 1, max: 24 }), {
  minLength: 1,
  maxLength: 36,
})

describe('Markdown incremental projection properties', () => {
  it('keeps M3 equivalent to the M2 oracle at every append checkpoint', () => {
    check(
      property(
        oneof(checkpointRichDocument, adversarialDocument),
        widthsArbitrary,
        (document, widths) => {
          let raw = ''
          let previous: RenderDocument | undefined

          for (const chunk of partitionText(document, widths)) {
            raw += chunk
            const actual = parsePreview(raw, { mode: 'M3', previous })
            const oracle = parsePreview(raw, { mode: 'M2' })
            expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
            previous = actual
          }
        },
      ),
      { seed: 0x51_00_04, numRuns: PROPERTY_RUNS },
    )
  })
})
