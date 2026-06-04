import type { DriveStep } from 'driver.js'
import type { TFunction } from 'i18next'

export const TOUR_SELECTORS = {
  navNewQr: '[data-tour="nav-new-qr"]',
  newUrlInput: '[data-tour="new-url-input"]',
  qrPreview: '[data-tour="qr-preview"]',
  qrSave: '[data-tour="qr-save"]',
} as const

export type OnboardingStepHooks = {
  /** Called when the user clicks Next on step 1 (sidebar New QR). Navigate to /new. */
  onStartNewQr: () => void
}

export function buildOnboardingSteps(hooks: OnboardingStepHooks, t: TFunction): DriveStep[] {
  return [
    {
      element: TOUR_SELECTORS.navNewQr,
      popover: {
        title: t('onboarding.welcomeTitle'),
        description: t('onboarding.welcomeDescription'),
        side: 'right',
        align: 'start',
        onNextClick: () => {
          hooks.onStartNewQr()
        },
      },
    },
    {
      element: TOUR_SELECTORS.newUrlInput,
      popover: {
        title: t('onboarding.pasteTitle'),
        description: t('onboarding.pasteDescription'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: TOUR_SELECTORS.qrPreview,
      popover: {
        title: t('onboarding.previewTitle'),
        description: t('onboarding.previewDescription'),
        side: 'left',
        align: 'start',
      },
    },
    {
      element: TOUR_SELECTORS.qrSave,
      popover: {
        title: t('onboarding.saveTitle'),
        description: t('onboarding.saveDescription'),
        side: 'bottom',
        align: 'end',
      },
    },
  ]
}
