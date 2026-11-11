import type { BenchmarkCorpus } from './types'

const WORDS = [
  'stream',
  'render',
  'checkpoint',
  'scheduler',
  'markdown',
  'browser',
  'frame',
  'delta',
  'stable',
  'suffix',
  'parser',
  'revision',
]

function nextRandom(state: number): number {
  let value = state | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

function makeSection(index: number, state: number): { text: string; state: number } {
  let cursor = state
  const selected: string[] = []
  for (let count = 0; count < 12; count += 1) {
    cursor = nextRandom(cursor)
    selected.push(WORDS[cursor % WORDS.length] ?? 'stream')
  }
  const label = index.toString().padStart(5, '0')
  return {
    state: cursor,
    text: [
      `## Checkpoint ${label}`,
      '',
      `${selected.slice(0, 8).join(' ')}.`,
      '',
      `- ${selected[8]} ${label}`,
      `- ${selected[9]} ${selected[10]} ${selected[11]}`,
      '',
    ].join('\n'),
  }
}

function makeStableBlock(index: number): string {
  const label = index.toString().padStart(5, '0')
  return `stable block ${label}: identity survives every later append.\n\n`
}

export function generateBenchmarkCorpus(
  corpus: BenchmarkCorpus,
  size: number,
  seed: number,
): string {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new RangeError('Benchmark size must be a positive safe integer')
  }
  if (corpus === 'no-checkpoint') return 'x'.repeat(size)
  if (corpus === 'stable-blocks') {
    let text = ''
    let blockIndex = 0
    while (text.length < size) {
      text += makeStableBlock(blockIndex)
      blockIndex += 1
    }
    return text.slice(0, size)
  }

  let state = seed >>> 0
  let text = ''
  let sectionIndex = 0
  while (text.length < size) {
    const section = makeSection(sectionIndex, state)
    state = section.state
    text += section.text
    sectionIndex += 1
  }
  return text.slice(0, size)
}
