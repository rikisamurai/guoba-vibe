// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_STORAGE_KEY,
  clearOnboardingStatus,
  getOnboardingStatus,
  setOnboardingStatus,
} from "@/app/onboarding/onboarding-storage";

describe("onboarding-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses a versioned storage key", () => {
    expect(ONBOARDING_STORAGE_KEY).toBe("qr-vault:onboarding-v1");
  });

  it("returns null when the key has never been written", () => {
    expect(getOnboardingStatus()).toBeNull();
  });

  it("writes and reads the 'done' status", () => {
    setOnboardingStatus("done");
    expect(getOnboardingStatus()).toBe("done");
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe("done");
  });

  it("writes and reads the 'skipped' status", () => {
    setOnboardingStatus("skipped");
    expect(getOnboardingStatus()).toBe("skipped");
  });

  it("returns null for an unknown stored value", () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "weird");
    expect(getOnboardingStatus()).toBeNull();
  });

  it("clearOnboardingStatus removes the key", () => {
    setOnboardingStatus("done");
    clearOnboardingStatus();
    expect(getOnboardingStatus()).toBeNull();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });
});
