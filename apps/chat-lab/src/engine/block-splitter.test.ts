import { beforeEach, describe, expect, test } from 'vitest'

import { CORPORA } from '../sim/corpus'
import { finalizeBlocks, resetBlockCache, splitBlocks } from './block-splitter'

beforeEach(() => {
  resetBlockCache()
})

function joinRaws(blocks: Array<{ raw: string }>): string {
  return blocks.map((block) => block.raw).join('')
}

/** Push a text into the splitter in n roughly even increments. */
function pushIncrementally(id: string, text: string, steps: number) {
  let result = splitBlocks(id, '')
  const stepSize = Math.ceil(text.length / steps)
  for (let end = stepSize; end < text.length + stepSize; end += stepSize) {
    result = splitBlocks(id, text.slice(0, Math.min(end, text.length)))
  }
  return result
}

describe('lossless partition invariant across all corpora', () => {
  for (const corpus of CORPORA) {
    test(`${corpus.id}: raws always reassemble the input`, () => {
      const stepSize = 97 // prime-ish stride to hit awkward boundaries
      for (let end = stepSize; end < corpus.text.length + stepSize; end += stepSize) {
        const prefix = corpus.text.slice(0, Math.min(end, corpus.text.length))
        const { blocks } = splitBlocks(corpus.id, prefix)
        expect(joinRaws(blocks)).toBe(prefix)
      }
      const final = finalizeBlocks(corpus.id, corpus.text)
      expect(joinRaws(final.blocks)).toBe(corpus.text)
      expect(final.blocks.every((block) => block.stable)).toBe(true)
    })
  }
})

test('classifies code and mermaid blocks with fence state', () => {
  const text = 'intro\n\n```ts\nconst a = 1\n```\n\n```mermaid\nflowchart LR\n  A --> B\n'
  const { blocks } = splitBlocks('kinds', text)
  const kinds = blocks.map((block) => block.kind)
  expect(kinds).toEqual(['markdown', 'code', 'mermaid'])
  expect(blocks[1].fence).toMatchObject({ lang: 'ts', closed: true })
  expect(blocks[2].fence).toMatchObject({ lang: 'mermaid', closed: false })
})

test('frozen blocks keep object identity across later pushes', () => {
  const head = '# Title\n\nFirst paragraph settled here.\n\n'
  splitBlocks('identity', head)
  splitBlocks('identity', `${head}second paragraph grows`)
  const before = splitBlocks('identity', `${head}second paragraph grows and grows`)
  const frozen = before.blocks.filter((block) => block.stable)
  expect(frozen.length).toBeGreaterThan(0)
  const after = splitBlocks('identity', `${head}second paragraph grows and grows more`)
  for (const [index, block] of frozen.entries()) {
    expect(after.blocks[index]).toBe(block)
  }
})

test('setext trap: a paragraph does not freeze before its === underline arrives', () => {
  const id = 'setext'
  splitBlocks(id, 'Setext trap\n')
  splitBlocks(id, 'Setext trap\n===')
  const { blocks } = splitBlocks(id, 'Setext trap\n===========\n\nnext paragraph')
  expect(blocks[0].raw).toContain('===')
  // the underlined region lexes as a single heading block, not paragraph + junk
  expect(blocks.filter((block) => block.raw.includes('Setext')).length).toBe(1)
})

test('loose list continuation does not split the list', () => {
  const id = 'loose'
  const part1 = '- A loose list item\n\n'
  const full = '- A loose list item\n\n  with a continuation paragraph\n\nafter the list'
  splitBlocks(id, part1)
  splitBlocks(id, part1) // unchanged push — would freeze if eligible
  const { blocks } = splitBlocks(id, full)
  const listBlock = blocks.find((block) => block.raw.includes('loose list item'))
  expect(listBlock?.raw).toContain('continuation paragraph')
})

test('stability requires surviving one unchanged push', () => {
  const id = 'twopush'
  const text = 'stable paragraph\n\ntail'
  const first = splitBlocks(id, text)
  expect(first.stableCount).toBe(0)
  const second = splitBlocks(id, `${text} grows`)
  expect(second.stableCount).toBe(1)
})

test('finalize reconciles ids for unchanged prefixes', () => {
  const id = 'reconcile'
  const text = 'para one\n\npara two\n\npara three'
  pushIncrementally(id, text, 7)
  const streamed = splitBlocks(id, text)
  const final = finalizeBlocks(id, text)
  expect(joinRaws(final.blocks)).toBe(text)
  for (const [index, block] of final.blocks.entries()) {
    if (streamed.blocks[index]?.raw === block.raw) {
      expect(block.id).toBe(streamed.blocks[index].id)
    }
  }
})

test('finalize corrects a mid-stream mis-freeze against the raw text', () => {
  const id = 'correct'
  // freeze 'para\n\n' then reveal that the whole thing was one fence all along
  splitBlocks(id, 'para\n\n')
  splitBlocks(id, 'para\n\nmore')
  const final = finalizeBlocks(id, '~~~\npara\n\nmore\n~~~\n')
  expect(joinRaws(final.blocks)).toBe('~~~\npara\n\nmore\n~~~\n')
  expect(final.blocks[0].kind).toBe('code')
})

test('same text twice returns the cached result without re-lexing', () => {
  const id = 'cache'
  const text = 'hello\n\nworld'
  splitBlocks(id, text)
  const again = splitBlocks(id, text)
  expect(again.tailParseMs).toBe(0)
})

test('ids never collide even after resets within one message', () => {
  const id = 'seq'
  splitBlocks(id, 'aaa\n\nbbb\n\n')
  splitBlocks(id, 'completely different text') // prefix mismatch → reset
  const { blocks } = splitBlocks(id, 'completely different text\n\nmore')
  const ids = blocks.map((block) => block.id)
  expect(new Set(ids).size).toBe(ids.length)
})
