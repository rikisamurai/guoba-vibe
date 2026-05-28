import type { DriveStep } from 'driver.js'

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

export function buildOnboardingSteps(hooks: OnboardingStepHooks): DriveStep[] {
  return [
    {
      element: TOUR_SELECTORS.navNewQr,
      popover: {
        title: 'Welcome to QR Vault',
        description:
          "Your local-first vault for QR codes and deep links. Let's create your first one.",
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
        title: 'Paste any URL or deep link',
        description:
          "QR Vault works with any web URL or app deep link. We've pre-filled a sample — replace it with your own, or keep it to see how it works.",
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: TOUR_SELECTORS.qrPreview,
      popover: {
        title: 'Live preview',
        description:
          'Your QR code is generated instantly on this device. The parsed URL appears below so you can verify it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: TOUR_SELECTORS.qrSave,
      popover: {
        title: 'Save it',
        description:
          'Stored locally in your browser — nothing leaves this device. You can edit, organize into Collections, or share via link anytime.',
        side: 'bottom',
        align: 'end',
      },
    },
  ]
}
