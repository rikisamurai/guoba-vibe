export const ONBOARDING_STORAGE_KEY = 'qr-vault:onboarding-v1'

export type OnboardingStatus = 'done' | 'skipped'

export function getOnboardingStatus(): OnboardingStatus | null {
  const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY)
  if (raw === 'done' || raw === 'skipped') return raw
  return null
}

export function setOnboardingStatus(status: OnboardingStatus): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, status)
}

export function clearOnboardingStatus(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY)
}
