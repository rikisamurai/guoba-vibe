import { afterEach, expect, it, vi } from 'vitest'

import { GET } from './capabilities'

afterEach(() => vi.unstubAllEnvs())

it('returns only the public enabled capability', async () => {
  vi.stubEnv('ENABLE_LIVE_API', '1')
  vi.stubEnv('DEEPSEEK_API_KEY', 'never-send-this')
  const payload: unknown = await GET().json()
  expect(payload).toMatchObject({ capability: { kind: 'enabled' } })
  expect(JSON.stringify(payload)).not.toContain('never-send-this')
  expect(JSON.stringify(payload)).not.toContain('deepseekApiKey')
})

it('reports missing_key separately', async () => {
  vi.stubEnv('ENABLE_LIVE_API', '1')
  vi.stubEnv('DEEPSEEK_API_KEY', '')
  expect(await GET().json()).toMatchObject({ capability: { kind: 'missing_key' } })
})
