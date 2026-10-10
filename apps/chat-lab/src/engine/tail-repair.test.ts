import { expect, test } from 'vitest'

import { repairTail } from './tail-repair'

test('closes an unclosed bold span', () => {
  expect(repairTail('some **bold text')).toBe('some **bold text**')
})

test('closes an unclosed __strong__ span', () => {
  expect(repairTail('some __strong text')).toBe('some __strong text__')
})

test('closes unclosed single-star emphasis', () => {
  expect(repairTail('some *emphasis here')).toBe('some *emphasis here*')
})

test('does not treat list bullets as emphasis', () => {
  expect(repairTail('- item\n* another bullet')).toBe('- item\n* another bullet')
})

test('closes unclosed inline code', () => {
  expect(repairTail('value is `raw.leng')).toBe('value is `raw.leng`')
})

test('closes double-backtick inline code with a matching run', () => {
  expect(repairTail('tricky ``code with ` inside')).toBe('tricky ``code with ` inside``')
})

test('ignores markers inside closed inline code', () => {
  const text = 'the `**not bold**` marker'
  expect(repairTail(text)).toBe(text)
})

test('closes an open ``` fence and skips inline repair inside it', () => {
  expect(repairTail('intro\n\n```ts\nconst a = "**"')).toBe('intro\n\n```ts\nconst a = "**"\n```')
})

test('closes an open ~~~ fence with the same run length', () => {
  expect(repairTail('~~~~\ncontent')).toBe('~~~~\ncontent\n~~~~')
})

test('leaves a properly closed fence alone', () => {
  const text = '```ts\ncode\n```\n\nafter **bold**'
  expect(repairTail(text)).toBe(text)
})

test('closes a half link label', () => {
  expect(repairTail('see [the docs')).toBe('see [the docs]')
})

test('closes a half link url', () => {
  expect(repairTail('see [docs](https://exam')).toBe('see [docs](https://exam)')
})

test('does not touch complete markdown', () => {
  const text = '# Title\n\n**bold** and *italic* and `code` and [link](https://a.b).'
  expect(repairTail(text)).toBe(text)
})

test('only repairs the tail paragraph, not earlier ones', () => {
  // the earlier paragraph's unclosed ** is old news; only the tail counts
  const text = 'broken **early paragraph\n\nfresh tail'
  expect(repairTail(text)).toBe(text)
})

test('is idempotent', () => {
  const cases = ['a **b', 'x `y', 'fence:\n```js\ncode', '[label](http://u', '*em', '[half']
  for (const input of cases) {
    const once = repairTail(input)
    expect(repairTail(once)).toBe(once)
  }
})

test('never modifies its input string', () => {
  const input = 'some **bold'
  repairTail(input)
  expect(input).toBe('some **bold')
})

test('empty input stays empty', () => {
  expect(repairTail('')).toBe('')
})
