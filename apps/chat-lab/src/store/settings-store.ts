import type { ProfileId } from '../sim/profiles'
import type { RendererMode } from '../types/message'
import { createStore, useStore } from './create-store'

export type SourceKind = 'live' | 'sim'
export type ProviderId = 'deepseek' | 'kimi'

export interface Settings {
  mode: RendererMode
  throttleMs: number
  source: SourceKind
  provider: ProviderId
  corpusId: string
  profileId: ProfileId
  speed: number
}

export const settingsStore = createStore<Settings>({
  mode: 'M0',
  throttleMs: 48,
  source: 'sim',
  provider: 'deepseek',
  corpusId: 'long-form',
  profileId: 'jitter',
  speed: 1,
})

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((state) => ({ ...state, ...patch }))
}

export function useSettings(): Settings {
  return useStore(settingsStore, (state) => state)
}
