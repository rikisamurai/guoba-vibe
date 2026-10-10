import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4178',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'tsx tests/e2e/start-web.ts',
    url: 'http://127.0.0.1:4178/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'web', testMatch: /web\.spec\.ts/u, use: { browserName: 'chromium' } },
    { name: 'electron', testMatch: /electron\.spec\.ts/u },
  ],
})
