import type { ProfileId } from '../sim/profiles'
import type { RendererMode } from '../types/message'
import { createStore, useStore } from './create-store'

export type SourceKind = 'live' | 'sim'
export type ProviderId = 'deepseek' | 'kimi'

export interface Settings {
  mode: RendererMode
  throttleMs: number
  smoothing: boolean
  source: SourceKind
  provider: ProviderId
  model: string
  corpusId: string
  profileId: ProfileId
  speed: number
}

export const settingsStore = createStore<Settings>({
  mode: 'M0',
  throttleMs: 48,
  smoothing: false,
  source: 'sim',
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
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
