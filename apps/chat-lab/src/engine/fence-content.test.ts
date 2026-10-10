import { expect, test } from 'vitest'

import { parseFenceContent } from './fence-content'

test('extracts code from a closed fence', () => {
  const raw = '```ts\nconst a = 1\nconst b = 2\n```\n\n'
  const result = parseFenceContent(raw, { lang: 'ts', closed: true })
  expect(result).toEqual({ lang: 'ts', code: 'const a = 1\nconst b = 2', closed: true })
})

test('keeps everything after the opening line for an open fence', () => {
  const raw = '```python\nprint("hi")\nprint("still stream'
  const result = parseFenceContent(raw, { lang: 'python', closed: false })
  expect(result.code).toBe('print("hi")\nprint("still stream')
  expect(result.closed).toBe(false)
})

test('handles tilde fences and empty bodies', () => {
  expect(parseFenceContent('~~~\n~~~\n', { lang: '', closed: true }).code).toBe('')
  expect(parseFenceContent('```js\n', { lang: 'js', closed: false }).code).toBe('')
})
