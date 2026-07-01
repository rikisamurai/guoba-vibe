import { describe, expect, it } from 'vitest'

import {
  buildEnvironmentLinks,
  exportWorkspace,
  importWorkspace,
  removeQueryParam,
  validateDeepLink,
  upsertQueryParam,
} from './deep-link-lab'

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

  it('edits custom scheme query params without losing the source route', () => {
    const updated = upsertQueryParam('xhsdiscover://item/detail?id=42', 'source', 'lab')
    const removed = removeQueryParam(updated, 'id')

    expect(updated).toBe('xhsdiscover://item/detail?id=42&source=lab')
    expect(removed).toBe('xhsdiscover://item/detail?source=lab')
  })

  it('round-trips a saved workspace through portable JSON', () => {
    const workspace = {
      name: 'Shopping release links',
      sourceUrl: 'xhsdiscover://item/detail?id=42',
      profiles: [{ id: 'prod', name: 'Production', params: { env: 'prod' } }],
    }

    expect(importWorkspace(exportWorkspace(workspace))).toEqual(workspace)
  })

  it('rejects invalid workspace imports and invalid source URLs', () => {
    expect(importWorkspace('{"sourceUrl":42}')).toBeNull()
    expect(validateDeepLink('not a url')).toEqual({
      ok: false,
      message: 'Enter a valid URL or app deep link.',
    })
  })
})
