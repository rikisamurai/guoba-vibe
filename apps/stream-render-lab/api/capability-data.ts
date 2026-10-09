export type LiveProtocol = 'chat-completions' | 'responses' | 'anthropic'

export interface ProtocolCapability {
  id: LiveProtocol
  label: string
  models: readonly string[]
  terminalProof: string
}

export const CAPABILITY_VERIFIED_AT = '2026-08-06'
export const DEFAULT_MODEL = 'deepseek-v4-flash'

export const PROTOCOL_CAPABILITIES: readonly ProtocolCapability[] = [
  {
    id: 'chat-completions',
    label: 'OpenAI Chat Completions',
    models: [DEFAULT_MODEL],
    terminalProof: '[DONE]',
  },
  {
    id: 'responses',
    label: 'OpenAI Responses',
    models: [DEFAULT_MODEL],
    terminalProof: 'response.completed | response.incomplete | response.failed',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Messages',
    models: [DEFAULT_MODEL],
    terminalProof: 'message_stop',
  },
]

export function capabilityFor(protocol: string): ProtocolCapability | null {
  return PROTOCOL_CAPABILITIES.find((item) => item.id === protocol) ?? null
}
