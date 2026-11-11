import { describe, expect, it } from 'vitest'

import { resolveLiveConfig } from './live-config'

describe('resolveLiveConfig', () => {
  it('keeps disabled, missing key and enabled distinct', () => {
    expect(resolveLiveConfig({})).toEqual({ capability: { kind: 'disabled' } })
    expect(resolveLiveConfig({ ENABLE_LIVE_API: '1' })).toEqual({
      capability: { kind: 'missing_key' },
    })
    expect(resolveLiveConfig({ ENABLE_LIVE_API: '1', DEEPSEEK_API_KEY: 'server-only' })).toEqual({
      capability: { kind: 'enabled' },
      deepseekApiKey: 'server-only',
    })
  })
})
