import { useNavigate, useRouterState } from '@tanstack/react-router'
import { driver, type Driver } from 'driver.js'
import { useCallback, useEffect, useRef } from 'react'

import 'driver.js/dist/driver.css'
import { TOUR_SELECTORS, buildOnboardingSteps } from '@/app/onboarding/onboarding-steps'
import {
  clearOnboardingStatus,
  getOnboardingStatus,
  setOnboardingStatus,
} from '@/app/onboarding/onboarding-storage'

const MAX_WAIT_FRAMES = 20
const ONBOARDING_SAMPLE_URL = 'https://www.google.com'
const ONBOARDING_SAMPLE_TITLE = 'Google'
const ONBOARDING_SAMPLE_DESCRIPTION = 'Sample from onboarding — edit or save'

/**
 * Wait for a selector to exist in the DOM, up to MAX_WAIT_FRAMES animation
 * frames (~333 ms). Resolves true if found, false if it never appears.
 */
function waitForElement(selector: string): Promise<boolean> {
  return new Promise((resolve) => {
    let frames = 0
    function check() {
      if (document.querySelector(selector)) {
        resolve(true)
        return
      }
      if (++frames >= MAX_WAIT_FRAMES) {
        console.warn(
          `[useOnboarding] waitForElement timed out after ${MAX_WAIT_FRAMES} frames waiting for ${selector}`,
        )
        resolve(false)
        return
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

export function useOnboarding() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const driverRef = useRef<Driver | null>(null)
  const pendingAdvanceRef = useRef(false)
  const autoStartedRef = useRef(false)

  // Build the driver instance once.
  useEffect(() => {
    const steps = buildOnboardingSteps({
      onStartNewQr: () => {
        pendingAdvanceRef.current = true
        void navigate({
          to: '/new',
          search: {
            url: ONBOARDING_SAMPLE_URL,
            title: ONBOARDING_SAMPLE_TITLE,
            description: ONBOARDING_SAMPLE_DESCRIPTION,
          },
        })
      },
    })

    const instance = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      progressText: 'Step {{current}} of {{total}}',
      allowClose: true,
      onDestroyStarted: () => {
        // User clicked X / pressed ESC / clicked overlay. Decide done vs skipped.
        const activeIndex = instance.getActiveIndex()
        const total = instance.getConfig().steps?.length ?? 0
        const isLast = activeIndex !== undefined && activeIndex === total - 1
        setOnboardingStatus(isLast ? 'done' : 'skipped')
        pendingAdvanceRef.current = false
        instance.destroy()
      },
      steps,
    })

    driverRef.current = instance

    return () => {
      instance.destroy()
      if (driverRef.current === instance) {
        driverRef.current = null
      }
      autoStartedRef.current = false
    }
  }, [navigate])

  // Auto-start once, only on /, only if never seen.
  useEffect(() => {
    if (autoStartedRef.current) return
    if (pathname !== '/') return
    if (getOnboardingStatus() !== null) return
    const instance = driverRef.current
    if (!instance) return
    autoStartedRef.current = true
    void waitForElement(TOUR_SELECTORS.navNewQr).then((found) => {
      if (!found) return
      if (driverRef.current !== instance) return
      instance.drive(0)
    })
  }, [pathname])

  // Bridge: when route changes to /new while a step-1 advance is pending,
  // wait for the URL input to mount, then advance the tour.
  useEffect(() => {
    if (!pendingAdvanceRef.current) return
    if (pathname !== '/new') return
    const instance = driverRef.current
    if (!instance) return
    pendingAdvanceRef.current = false
    void waitForElement(TOUR_SELECTORS.newUrlInput).then((found) => {
      if (!found) return
      if (driverRef.current !== instance) return
      instance.moveNext()
    })
  }, [pathname])

  const restart = useCallback(() => {
    clearOnboardingStatus()
    autoStartedRef.current = false
    pendingAdvanceRef.current = false
    const instance = driverRef.current
    if (!instance) return
    const startTour = () =>
      waitForElement(TOUR_SELECTORS.navNewQr).then((found) => {
        if (!found) return
        if (driverRef.current !== instance) return
        instance.drive(0)
      })
    if (pathname !== '/') {
      void navigate({ to: '/' }).then(() => {
        void startTour()
      })
      return
    }
    void startTour()
  }, [navigate, pathname])

  return { restart }
}
