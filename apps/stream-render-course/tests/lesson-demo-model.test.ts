import { describe, expect, it } from 'vitest'

import { acceptDemoReport, createDemoUrls } from '../components/lesson-demo-model'

describe('lesson demo boundary', () => {
  it('builds deterministic embed and full-lab URLs', () => {
    expect(createDemoUrls('sse', 'sse-edge-cases', 'https://lab.example.test/path')).toEqual({
      embed: 'https://lab.example.test/embed/sse?preset=sse-edge-cases',
      fullLab: 'https://lab.example.test/lab?demo=sse&preset=sse-edge-cases',
      origin: 'https://lab.example.test',
    })
  })

  it('accepts only the expected origin, source, version and demo', () => {
    const source = {}
    const ready = { version: 1, kind: 'ready', demoId: 'quick-start' }
    const expected = { demoId: 'quick-start' as const, origin: 'https://lab.test', source }

    expect(acceptDemoReport({ data: ready, origin: 'https://lab.test', source }, expected)).toEqual(
      ready,
    )
    expect(
      acceptDemoReport({ data: ready, origin: 'https://evil.test', source }, expected),
    ).toBeUndefined()
    expect(
      acceptDemoReport({ data: ready, origin: 'https://lab.test', source: {} }, expected),
    ).toBeUndefined()
    expect(
      acceptDemoReport(
        {
          data: { version: 1, kind: 'ready', demoId: 'sse' },
          origin: 'https://lab.test',
          source,
        },
        expected,
      ),
    ).toBeUndefined()
  })
})
