import { readlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { _electron as electron, expect, test } from '@playwright/test'

import { createE2eFixture } from './fixture'

test('launches the real Electron shell with the shared inventory UI', async () => {
  const fixture = await createE2eFixture('electron-runtime')
  const executablePath = process.env.GUOBA_SKILLS_PACKAGED_APP
  const application = await electron.launch({
    ...(executablePath
      ? { executablePath }
      : { args: [join(resolve(), 'out/main/index.js')], cwd: resolve() }),
    env: {
      ...process.env,
      GUOBA_SKILLS_E2E: '1',
      GUOBA_SKILLS_HOME: fixture.home,
      GUOBA_SKILLS_PROJECT_ROOT: fixture.project,
    },
  })
  try {
    const page = await application.firstWindow()
    await expect(page).toHaveTitle('Guoba Skills')
    const trustedUrl = page.url()
    await page.evaluate(() => window.location.assign('data:text/html,untrusted'))
    await expect(page).toHaveURL(trustedUrl)
    await expect(page.getByText('Guoba Skills', { exact: true })).toBeVisible()
    await expect(page.getByTestId('skill-project:demo')).toBeVisible()
    await expect(page.getByTestId('skill-user:user-helper')).toBeVisible()
    if (process.env.GUOBA_SKILLS_CAPTURE) {
      await page.waitForTimeout(300)
      await page.screenshot({ path: process.env.GUOBA_SKILLS_CAPTURE })
    }
    await page.getByTestId('skill-user:user-helper').click()
    await expect(page.getByTestId('inspector')).toContainText('User body')
    await page.getByRole('tab', { name: 'files' }).click()
    await page.getByRole('button', { name: /SKILL\.md/u }).click()
    await expect(page.getByTestId('file-preview')).toContainText('User body')
    if (process.env.GUOBA_SKILLS_CAPTURE_FILES) {
      await page.screenshot({ path: process.env.GUOBA_SKILLS_CAPTURE_FILES })
    }
    await page.getByTestId('skill-project:demo').click()
    await page.getByTitle('Check upstream').click()
    await expect(page.getByText('Update available').first()).toBeVisible()
    await page.getByRole('button', { name: 'Review update' }).click()
    await expect(page.getByTestId('update-diff')).toContainText('Version B')
    await page.getByRole('button', { name: 'Apply update' }).click()
    await expect(page.getByTestId('inspector')).toContainText('Version B')
    await page.getByTestId('skill-project:claude-only').click()
    await page.getByRole('button', { name: 'Make canonical' }).click()
    await expect(page.getByRole('button', { name: 'Make canonical' })).toBeHidden()
    await expect
      .poll(() => readlink(join(fixture.project, '.claude', 'skills', 'claude-only')))
      .toContain('.agents/skills/claude-only')
    await page.getByRole('button', { name: 'Add Skill' }).click()
    await expect(page.getByRole('heading', { name: 'Add a Skill' })).toBeVisible()
  } finally {
    await application.close()
  }
})
