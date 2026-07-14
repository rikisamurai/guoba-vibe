import process from 'node:process'

import { defineConfig, devices } from '@playwright/test'

import { LIVE_ACCESS_KEY } from './e2e-live/environment'

const port = 4174
const baseURL = `http://127.0.0.1:${port}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-live', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    env: {
      ACCESS_KEYS: LIVE_ACCESS_KEY,
      DOWNLOAD_SIGNING_SECRET: 'guoba-stream-live-e2e-signing-secret',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
