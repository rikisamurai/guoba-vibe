import { expect, test } from 'vitest'

import { getModel, getProvider, PROVIDERS } from './providers'

test('both providers are registered with at least one model', () => {
  expect(PROVIDERS.map((provider) => provider.id)).toEqual(['deepseek', 'kimi'])
  expect(PROVIDERS.every((provider) => provider.models.length > 0)).toBe(true)
})

test('getProvider resolves known ids and rejects unknown ones', () => {
  expect(getProvider('deepseek')?.envKey).toBe('DEEPSEEK_API_KEY')
  expect(getProvider('kimi')?.baseUrl).toContain('moonshot')
  expect(getProvider('openai')).toBeNull()
})

test('getModel enforces the whitelist', () => {
  const deepseek = getProvider('deepseek')
  expect(deepseek).not.toBeNull()
  if (deepseek === null) return
  expect(getModel(deepseek, 'deepseek-v4-flash')).not.toBeNull()
  expect(getModel(deepseek, 'gpt-4o')).toBeNull()
})

test('deepseek models ship with thinking disabled', () => {
  const deepseek = getProvider('deepseek')
  expect(deepseek?.models[0].extraBody).toEqual({ thinking: { type: 'disabled' } })
})
