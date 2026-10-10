/**
 * Provider registry — the only whitelist the proxy will forward to.
 * Model ids verified against live /models endpoints on 2026-08-05.
 */
export type ProviderId = 'deepseek' | 'kimi'

export interface ModelOption {
  id: string
  /** Extra body fields merged into the upstream request (e.g. disable thinking). */
  extraBody?: Record<string, unknown>
}

export interface Provider {
  id: ProviderId
  label: string
  baseUrl: string
  envKey: string
  /** First entry is the default model. */
  models: ModelOption[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    envKey: 'DEEPSEEK_API_KEY',
    models: [
      // v4 models reason by default; disabled here so content streams immediately
      { id: 'deepseek-v4-flash', extraBody: { thinking: { type: 'disabled' } } },
      { id: 'deepseek-v4-pro', extraBody: { thinking: { type: 'disabled' } } },
    ],
  },
  {
    id: 'kimi',
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    envKey: 'KIMI_API_KEY',
    models: [
      { id: 'moonshot-v1-auto' },
      // k2.6 reasons first (reasoning_content is ignored client-side): expect a
      // silent lead-in before visible text
      { id: 'kimi-k2.6' },
    ],
  },
]

export function getProvider(id: string): Provider | null {
  return PROVIDERS.find((provider) => provider.id === id) ?? null
}

export function getModel(provider: Provider, modelId: string): ModelOption | null {
  return provider.models.find((model) => model.id === modelId) ?? null
}
