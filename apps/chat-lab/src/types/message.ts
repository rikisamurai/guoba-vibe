export type MessagePhase = 'streaming' | 'draining' | 'final' | 'cancelled' | 'error'

export type RendererMode = 'M0' | 'M1' | 'M2' | 'M3'

export const TERMINAL_PHASES: MessagePhase[] = ['final', 'cancelled', 'error']

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  /**
   * The committed visible prefix of the model's raw output. Tail repair and
   * block derivation happen at render time and never write back here, so at
   * terminal phases this IS the untouched raw text.
   */
  text: string
  phase: MessagePhase
  commitIndex: number
  mode?: RendererMode
  sourceLabel?: string
  error?: string
}

export function isTerminal(phase: MessagePhase): boolean {
  return TERMINAL_PHASES.includes(phase)
}
