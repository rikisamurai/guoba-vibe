import { describe, expect, it } from 'vitest'

import { createLatestFileReader } from '@/app/latest-file-reader'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('latest file reader', () => {
  it('ignores an older file that finishes after the latest selection', async () => {
    const firstText = deferred<string>()
    const secondText = deferred<string>()
    const reader = createLatestFileReader()

    const first = reader.read({ name: 'first.json', text: () => firstText.promise })
    const second = reader.read({ name: 'second.json', text: () => secondText.promise })

    secondText.resolve('second')
    await expect(second).resolves.toEqual({
      kind: 'loaded',
      fileName: 'second.json',
      raw: 'second',
    })
    firstText.resolve('first')
    await expect(first).resolves.toEqual({ kind: 'stale' })
  })
})
