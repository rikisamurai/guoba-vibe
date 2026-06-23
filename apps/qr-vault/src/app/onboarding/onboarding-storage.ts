export const ONBOARDING_STORAGE_KEY = 'qr-vault:onboarding-v1'

export type OnboardingStatus = 'done' | 'skipped'

type OnboardingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getDefaultStorage(): OnboardingStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export function getOnboardingStatus(storage = getDefaultStorage()): OnboardingStatus | null {
  const raw = storage?.getItem(ONBOARDING_STORAGE_KEY)
  if (raw === 'done' || raw === 'skipped') return raw
  return null
}

export function setOnboardingStatus(status: OnboardingStatus, storage = getDefaultStorage()): void {
  storage?.setItem(ONBOARDING_STORAGE_KEY, status)
}

export function clearOnboardingStatus(storage = getDefaultStorage()): void {
  storage?.removeItem(ONBOARDING_STORAGE_KEY)
}
