import { describe, expect, it } from 'vitest'

import { buildEnvironmentLinks } from './deep-link-lab'

describe('buildEnvironmentLinks', () => {
  it('keeps a custom scheme deep link while applying each environment params', () => {
    const links = buildEnvironmentLinks('xhsdiscover://item/detail?id=42&env=prod', [
      {
        id: 'staging',
        name: 'Staging',
        params: { env: 'staging', source: 'lab' },
      },
      {
        id: 'preview',
        name: 'Preview',
        params: { env: 'preview', source: 'lab' },
      },
    ])

    expect(links).toEqual([
      {
        id: 'staging',
        name: 'Staging',
        url: 'xhsdiscover://item/detail?id=42&env=staging&source=lab',
        queryCount: 3,
      },
      {
        id: 'preview',
        name: 'Preview',
        url: 'xhsdiscover://item/detail?id=42&env=preview&source=lab',
        queryCount: 3,
      },
    ])
  })
})
