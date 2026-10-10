import type { ProviderId } from '../src/lib/chat-types'

export interface Provider {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  modelEnv: string
  apiKeyEnv: string
}

export const providers: Record<ProviderId, Provider> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    modelEnv: 'DEEPSEEK_MODEL',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
    modelEnv: 'KIMI_MODEL',
    apiKeyEnv: 'KIMI_API_KEY',
  },
}
