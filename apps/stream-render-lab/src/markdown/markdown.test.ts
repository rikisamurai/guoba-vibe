import { describe, expect, it } from 'vitest'

import { normalizeRenderIr, parseCanonical, parsePreview, repairPreview } from './index'

function previewWork(mode: 'M2' | 'M3', count: number): number {
  let previous: ReturnType<typeof parsePreview> | undefined
  let raw = ''
  let work = 0
  for (let index = 0; index < count; index += 1) {
    raw += `${index === 0 ? '' : '\n\n'}block ${index.toString().padStart(4, '0')}`
    previous = parsePreview(raw, { mode, previous })
    work += previous.work.parsedCodeUnits
  }
  return work
}

describe('parseCanonical', () => {
  it('produces parser-neutral GFM and math blocks whose raw ranges partition the input', () => {
    const raw = '# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n$$\nx^2\n$$'
    const document = parseCanonical(raw)

    expect(document.blocks.map((block) => block.node.type)).toEqual(['heading', 'table', 'math'])
    expect(document.blocks.map((block) => block.raw).join('')).toBe(raw)
    expect(document.blocks[1]?.node.children?.[0]?.type).toBe('tableRow')
    expect(document.repair).toBeUndefined()
    expect(document.work).toEqual({ parsedCodeUnits: raw.length, strategy: 'full' })
  })

  it('represents raw HTML as inert text while preserving its source', () => {
    const raw = '<script>alert(1)</script>'
    const document = parseCanonical(raw)
    expect(document.blocks[0]?.node).toMatchObject({ type: 'text', value: raw })
    expect(document.blocks[0]?.raw).toBe(raw)
  })
})

describe('preview repair', () => {
  it('adds synthetic closers to the projection without mutating canonical raw', () => {
    const raw = '**hello'
    const repair = repairPreview(raw)
    const document = parsePreview(raw, { mode: 'M2' })

    expect(repair).toEqual({ text: '**hello**', syntheticRanges: [{ start: 7, end: 9 }] })
    expect(document.raw).toBe(raw)
    expect(document.visible).toBe('**hello**')
    expect(document.blocks.map((block) => block.raw).join('')).toBe(raw)
    expect(document.blocks[0]?.node.children?.[0]?.type).toBe('strong')
    const terminal = parseCanonical(document.raw)
    expect(terminal.repair).toBeUndefined()
    expect(terminal.visible).toBe(raw)
    expect(terminal.blocks[0]?.node.children?.[0]?.type).toBe('text')
  })

  it('ignores emphasis markers inside inline code spans', () => {
    const raw = '`**`'

    expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
  })

  it('does not treat a fenced-code line with trailing info as a closing fence', () => {
    const raw = '```js\nconst value = 1\n```ts'

    expect(repairPreview(raw)).toEqual({
      text: `${raw}\n\`\`\``,
      syntheticRanges: [{ start: raw.length, end: raw.length + 4 }],
    })
  })

  it('ignores math delimiters inside inline code spans', () => {
    const raw = '`$$`'

    expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
  })

  it('ignores math delimiters inside a closed fenced-code block', () => {
    const raw = '```md\n$$\n```'

    expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
  })

  it.each(['Price is $$5', 'a $$ b', 'x$$y', '$$ x $$'])(
    'does not turn paragraph text %j into a synthetic math block',
    (raw) => {
      expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
    },
  )

  it('closes a standalone math fence with the same delimiter length', () => {
    const raw = '$$$'
    const repair = repairPreview(raw)
    const preview = parsePreview(raw, { mode: 'M2' })
    const canonical = parseCanonical(raw)

    expect(repair).toEqual({
      text: `${raw}\n${raw}`,
      syntheticRanges: [{ start: raw.length, end: raw.length * 2 + 1 }],
    })
    expect(preview.blocks).toHaveLength(1)
    expect(preview.blocks[0]?.node).toMatchObject({ type: 'math', value: '' })
    expect(preview.blocks[0]?.node.value).toBe(canonical.blocks[0]?.node.value)
  })

  it('rejects a backtick fence whose opening info contains a backtick', () => {
    const raw = '```a`'

    expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
  })

  it('recognizes fenced-code boundaries separated by lone carriage returns', () => {
    const raw = '```js\r$$\r```'

    expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
  })

  it.each(['foo__bar', 'a ** b', '**'])(
    'does not repair non-opening or empty emphasis delimiter %j',
    (raw) => {
      expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
    },
  )

  it.each(['**balanced**', '__balanced__'])(
    'does not repair an already balanced emphasis delimiter %j',
    (raw) => {
      expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
    },
  )

  it('repairs an unclosed opener after a balanced strong span', () => {
    const raw = '**closed** and **open'

    expect(repairPreview(raw)).toEqual({
      text: `${raw}**`,
      syntheticRanges: [{ start: raw.length, end: raw.length + 2 }],
    })
  })

  it.each(['**a***', '**a****'])(
    'uses a longer delimiter run as closing capacity instead of repairing %j',
    (raw) => {
      expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
    },
  )

  it.each(['**a\n\n', 'p\n\n**a\n\nnext'])(
    'does not carry an emphasis opener across a blank-line block boundary in %j',
    (raw) => {
      expect(repairPreview(raw)).toEqual({ text: raw, syntheticRanges: [] })
    },
  )
})

describe('M2 full preview', () => {
  it('keeps unchanged block identity while reparsing a Setext-changing tail', () => {
    const before = parsePreview('stable\n\nheading', { mode: 'M2' })
    const after = parsePreview('stable\n\nheading\n---', { mode: 'M2', previous: before })

    expect(after.blocks[0]).toBe(before.blocks[0])
    expect(before.blocks[1]?.node.type).toBe('paragraph')
    expect(after.blocks[1]?.node.type).toBe('heading')
    expect(after.blocks.map((block) => block.raw).join('')).toBe(after.raw)
  })

  it('reinterprets a paragraph as a GFM table when the delimiter arrives', () => {
    const before = parsePreview('| a | b |', { mode: 'M2' })
    const after = parsePreview('| a | b |\n| - | - |', { mode: 'M2', previous: before })

    expect(before.blocks[0]?.type).toBe('paragraph')
    expect(after.blocks[0]?.type).toBe('table')
  })

  it('does not reuse a block whose reference semantics changed globally', () => {
    const beforeRaw = '# lead\n\n[x]\n\ntail'
    const before = parsePreview(beforeRaw, { mode: 'M2' })
    const after = parsePreview(`${beforeRaw}\n\n[x]: /url`, { mode: 'M2', previous: before })

    expect(before.blocks[1]?.node.children?.[0]?.type).toBe('text')
    expect(after.blocks[1]?.node.children?.[0]?.type).toBe('link')
    expect(after.blocks[1]).not.toBe(before.blocks[1])
  })
})

describe('M3 bounded suffix preview', () => {
  it('treats the first append from an empty engine document as a baseline full parse', () => {
    const initial = parseCanonical('')
    const first = parsePreview('hello', { mode: 'M3', previous: initial })
    expect(first.work).toEqual({ parsedCodeUnits: 5, strategy: 'full' })
    expect(first.diagnostics).toEqual([])
  })

  it('stitches a reparsed root suffix onto the stable prefix and rebases positions', () => {
    const before = parsePreview('alpha\n\nbeta', { mode: 'M3' })
    const raw = 'alpha\n\nbeta\n\n## gamma'
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.work).toEqual({ parsedCodeUnits: raw.length - 7, strategy: 'suffix' })
    expect(actual.blocks[0]).toBe(before.blocks[0])
    expect(actual.blocks.map((block) => block.raw).join('')).toBe(raw)
    expect(actual.blocks[2]?.node.position?.start.offset).toBe(raw.indexOf('## gamma'))
    expect(actual.blocks[2]?.node.position?.start.line).toBe(5)
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it.each([1, 2, 3])(
    'preserves %i leading spaces when the dirty root child starts mid-line',
    (spaceCount) => {
      const indentation = ' '.repeat(spaceCount)
      const before = parsePreview(`stable\n\n${indentation}beta`, { mode: 'M3' })
      const raw = `${before.raw}\n\nnext`
      const actual = parsePreview(raw, { mode: 'M3', previous: before })
      const oracle = parsePreview(raw, { mode: 'M2' })

      expect(actual.blocks[1]?.node.position?.start.column).toBe(spaceCount + 1)
      expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
    },
  )

  it.each(['\r', '\r\n'])('rebases suffix positions across %j line endings', (lineEnding) => {
    const before = parsePreview(`alpha${lineEnding}${lineEnding}beta`, { mode: 'M3' })
    const raw = `${before.raw}${lineEnding}${lineEnding}next`
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.blocks[1]?.node.position?.start.line).toBe(3)
    expect(actual.blocks[2]?.node.position?.start.line).toBe(5)
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it('falls back to a full parse when a definition changes earlier references', () => {
    const beforeRaw = '# lead\n\n[x]\n\nlast'
    const before = parsePreview(beforeRaw, { mode: 'M3' })
    const raw = `${beforeRaw}\n\n[x]: /url`
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.work).toEqual({
      parsedCodeUnits: raw.length + raw.length - (before.blocks.at(-1)?.range.start ?? 0),
      strategy: 'full-fallback',
      fallbackReason: 'global_definition_fallback',
    })
    expect(actual.diagnostics[0]).toEqual({
      code: 'global_definition_fallback',
      offset: raw.indexOf('[x]: /url'),
    })
    expect(actual.blocks[1]?.node.children?.[0]?.type).toBe('link')
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it('falls back when a stable-prefix definition resolves a new tail reference', () => {
    const beforeRaw = '[x]: /from-prefix\n\nstable'
    const before = parsePreview(beforeRaw, { mode: 'M3' })
    const raw = `${beforeRaw}\n\n[x]`
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.work.fallbackReason).toBe('global_definition_fallback')
    expect(actual.blocks.at(-1)?.node.children?.[0]).toMatchObject({
      type: 'link',
      url: '/from-prefix',
    })
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it('reports expected degradation when a giant paragraph has no checkpoint', () => {
    const before = parsePreview('a'.repeat(1_000), { mode: 'M3' })
    const raw = `${before.raw}${'b'.repeat(100)}`
    const after = parsePreview(raw, { mode: 'M3', previous: before })

    expect(after.work).toEqual({
      parsedCodeUnits: raw.length,
      strategy: 'full-fallback',
      fallbackReason: 'no_quiescent_checkpoint',
    })
    expect(after.diagnostics).toContainEqual({ code: 'no_quiescent_checkpoint', offset: 0 })
  })

  it('reparses a whole root list when a late blank line changes looseness', () => {
    const before = parsePreview('intro\n\n- one\n- two', { mode: 'M3' })
    const raw = `${before.raw}\n\n- three`
    const after = parsePreview(raw, { mode: 'M3', previous: before })

    expect(after.blocks[0]).toBe(before.blocks[0])
    expect(after.blocks[1]?.node.type).toBe('list')
    expect(after.blocks[1]?.node.spread).toBe(true)
  })

  it('reparses the root blockquote for nested-list lazy continuation', () => {
    const before = parsePreview('intro\n\n> - nested\n>   continuation', { mode: 'M3' })
    const raw = `${before.raw}\n> lazy continuation`
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.blocks[0]).toBe(before.blocks[0])
    expect(actual.blocks[1]?.node.type).toBe('blockquote')
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it('treats a definition nested in a blockquote as a global invalidation', () => {
    const beforeRaw = '# lead\n\n[x]\n\ntail'
    const before = parsePreview(beforeRaw, { mode: 'M3' })
    const raw = `${beforeRaw}\n\n> [x]: /inside`
    const after = parsePreview(raw, { mode: 'M3', previous: before })

    expect(after.work.fallbackReason).toBe('global_definition_fallback')
    expect(after.blocks[1]?.node.children?.[0]?.url).toBe('/inside')
  })

  it('uses the first duplicate definition when resolving references', () => {
    const document = parseCanonical('[x]\n\n[x]: /first\n\n[x]: /second')
    expect(document.blocks[0]?.node.children?.[0]?.url).toBe('/first')
  })

  it('reports no checkpoint for a single giant unfinished fence', () => {
    const before = parsePreview(`\`\`\`ts\n${'x'.repeat(1_000)}`, { mode: 'M3' })
    const after = parsePreview(`${before.raw}y`, { mode: 'M3', previous: before })
    expect(after.work.fallbackReason).toBe('no_quiescent_checkpoint')
  })

  it('reports no checkpoint for one giant root list', () => {
    const beforeRaw = Array.from({ length: 300 }, (_, index) => `- item ${index}`).join('\n')
    const before = parsePreview(beforeRaw, { mode: 'M3' })
    const after = parsePreview(`${beforeRaw}\n- final`, { mode: 'M3', previous: before })

    expect(after.blocks).toHaveLength(1)
    expect(after.blocks[0]?.node.type).toBe('list')
    expect(after.work.fallbackReason).toBe('no_quiescent_checkpoint')
  })

  it.each([
    ['HTML block', '<div>\ncontent'],
    ['math fence', '$$\nx^2'],
  ])('reports no checkpoint for a single unfinished %s', (_label, beforeRaw) => {
    const before = parsePreview(beforeRaw, { mode: 'M3' })
    const raw = `${beforeRaw}\nmore`
    const actual = parsePreview(raw, { mode: 'M3', previous: before })
    const oracle = parsePreview(raw, { mode: 'M2' })

    expect(actual.work.fallbackReason).toBe('no_quiescent_checkpoint')
    expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
  })

  it('does not mistake definition-shaped text inside a fence for a global definition', () => {
    const before = parsePreview('intro\n\n```md\n[x]: /not-a-definition', { mode: 'M3' })
    const after = parsePreview(`${before.raw}\nmore`, { mode: 'M3', previous: before })
    expect(after.work.strategy).toBe('suffix')
    expect(after.diagnostics).toEqual([])
  })

  it('matches the M2 oracle at every adversarial append checkpoint', () => {
    const chunks = [
      'lead',
      '\n\nheading',
      '\n---',
      '\n\n| a | b |',
      '\n| - | - |',
      '\n| 1 | 2 |',
      '\n\n- one',
      '\n- two',
      '\n\n  continuation',
      '\n\n```ts',
      '\nconst x = 1',
      '\n```',
      '\n\n[x]',
      '\n\n[x]: /url',
    ]
    let raw = ''
    let previous: ReturnType<typeof parsePreview> | undefined
    for (const chunk of chunks) {
      raw += chunk
      const actual = parsePreview(raw, { mode: 'M3', previous })
      const oracle = parsePreview(raw, { mode: 'M2' })
      expect(normalizeRenderIr(actual)).toEqual(normalizeRenderIr(oracle))
      previous = actual
    }
  })

  it('separates quadratic full-preview work from bounded-tail work as input doubles', () => {
    const m2Ratio = previewWork('M2', 128) / previewWork('M2', 64)
    const m3Ratio = previewWork('M3', 128) / previewWork('M3', 64)
    expect(m2Ratio).toBeGreaterThan(3.8)
    expect(m2Ratio).toBeLessThan(4.2)
    expect(m3Ratio).toBeGreaterThan(1.8)
    expect(m3Ratio).toBeLessThan(2.2)
  })
})
