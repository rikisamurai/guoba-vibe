export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export type ProviderId = 'deepseek' | 'kimi'

export interface ChatRequest {
  provider: ProviderId
  messages: ChatMessage[]
}
