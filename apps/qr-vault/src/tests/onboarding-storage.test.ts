// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ONBOARDING_STORAGE_KEY,
  clearOnboardingStatus,
  getOnboardingStatus,
  setOnboardingStatus,
} from '@/app/onboarding/onboarding-storage'

describe('onboarding-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('uses a versioned storage key', () => {
    expect(ONBOARDING_STORAGE_KEY).toBe('qr-vault:onboarding-v1')
  })

  it('returns null when the key has never been written', () => {
    expect(getOnboardingStatus(window.localStorage)).toBeNull()
  })

  it("writes and reads the 'done' status", () => {
    setOnboardingStatus('done', window.localStorage)
    expect(getOnboardingStatus(window.localStorage)).toBe('done')
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('done')
  })

  it("writes and reads the 'skipped' status", () => {
    setOnboardingStatus('skipped', window.localStorage)
    expect(getOnboardingStatus(window.localStorage)).toBe('skipped')
  })

  it('returns null for an unknown stored value', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'weird')
    expect(getOnboardingStatus(window.localStorage)).toBeNull()
  })

  it('clearOnboardingStatus removes the key', () => {
    setOnboardingStatus('done', window.localStorage)
    clearOnboardingStatus(window.localStorage)
    expect(getOnboardingStatus(window.localStorage)).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull()
  })
})
