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

const SETTINGS_KEY = 'chat-lab:settings:v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Restore persisted settings (only known keys with valid values) and save on change. */
export function initSettingsPersistence(storage: Pick<Storage, 'getItem' | 'setItem'>): void {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    if (isRecord(parsed)) {
      const loaded = parsed
      const patch: Partial<Settings> = {}
      if (
        loaded.mode === 'M0' ||
        loaded.mode === 'M1' ||
        loaded.mode === 'M2' ||
        loaded.mode === 'M3'
      )
        patch.mode = loaded.mode
      if (typeof loaded.throttleMs === 'number') patch.throttleMs = loaded.throttleMs
      if (typeof loaded.smoothing === 'boolean') patch.smoothing = loaded.smoothing
      if (loaded.source === 'live' || loaded.source === 'sim') patch.source = loaded.source
      if (loaded.provider === 'deepseek' || loaded.provider === 'kimi')
        patch.provider = loaded.provider
      if (typeof loaded.model === 'string') patch.model = loaded.model
      if (typeof loaded.corpusId === 'string') patch.corpusId = loaded.corpusId
      if (
        loaded.profileId === 'ideal' ||
        loaded.profileId === 'jitter' ||
        loaded.profileId === 'burst' ||
        loaded.profileId === 'boundary'
      )
        patch.profileId = loaded.profileId
      if (typeof loaded.speed === 'number') patch.speed = loaded.speed
      settingsStore.set((state) => ({ ...state, ...patch }))
    }
  } catch {
    // broken settings fall back to defaults
  }
  settingsStore.subscribe(() => {
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(settingsStore.get()))
    } catch {
      // best effort
    }
  })
}
