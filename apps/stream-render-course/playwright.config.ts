import process from 'node:process'

import { defineConfig, devices } from '@playwright/test'

const courseOrigin = 'http://127.0.0.1:5273'
const labOrigin = 'http://127.0.0.1:5274'
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: courseOrigin,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `STREAM_RENDER_COURSE_PORT=5273 PUBLIC_LAB_ORIGIN=${labOrigin} pnpm dev`,
      url: courseOrigin,
      reuseExistingServer: !isCI,
    },
    {
      command: `STREAM_RENDER_LAB_PORT=5274 VITE_COURSE_ORIGIN=${courseOrigin} ENABLE_LIVE_API=0 pnpm --filter stream-render-lab dev`,
      url: labOrigin,
      reuseExistingServer: !isCI,
    },
  ],
})
