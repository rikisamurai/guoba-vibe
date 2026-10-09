export type LiveCapability = { kind: 'enabled' } | { kind: 'disabled' } | { kind: 'missing_key' }

export interface LiveConfig {
  capability: LiveCapability
  deepseekApiKey?: string
}

export const SERVER_ENV_NAMES = ['ENABLE_LIVE_API', 'DEEPSEEK_API_KEY'] as const

type ServerEnv = Readonly<Record<string, string | undefined>>

export function resolveLiveConfig(env: ServerEnv): LiveConfig {
  if (env.ENABLE_LIVE_API !== '1') return { capability: { kind: 'disabled' } }
  const key = env.DEEPSEEK_API_KEY
  if (key === undefined || key === '') return { capability: { kind: 'missing_key' } }
  return { capability: { kind: 'enabled' }, deepseekApiKey: key }
}
