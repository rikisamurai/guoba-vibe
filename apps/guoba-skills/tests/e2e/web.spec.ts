import { expect, test } from '@playwright/test'

test('aggregates Project, User, and Claude-only Skills', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Guoba Skills', { exact: true })).toBeVisible()
  await expect(page.getByTestId('skill-project:demo')).toBeVisible()
  await expect(page.getByTestId('skill-project:claude-only')).toBeVisible()
  await expect(page.getByTestId('skill-user:user-helper')).toBeVisible()
  await page.getByTestId('skill-project:claude-only').click()
  await expect(page.getByRole('button', { name: 'Make canonical' })).toBeVisible()
  await page.getByLabel('Search Skills').fill('user-helper')
  await expect(page.getByTestId('skill-user:user-helper')).toBeVisible()
  await expect(page.getByTestId('skill-project:demo')).toBeHidden()
})

test('checks, previews, and applies an exact upstream update', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('skill-project:demo').click()
  await page.getByTitle('Check upstream').click()
  await expect(page.getByText('Update available').first()).toBeVisible()
  await page.getByRole('button', { name: 'Review update' }).click()
  await expect(page.getByTestId('update-diff')).toContainText('Version B')
  await expect(page.getByText('Apply uses this exact prepared revision')).toBeVisible()
  await page.getByRole('button', { name: 'Apply update' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('inspector')).toContainText('Version B')
})

test('opens files from the Skill inventory', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('skill-user:user-helper').click()
  await page.getByRole('tab', { name: 'files' }).click()
  await page.getByRole('button', { name: /SKILL\.md/u }).click()
  await expect(page.getByTestId('file-preview')).toContainText('User body')
})

test('opens the guided skills.sh install flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Skill' }).click()
  await expect(page.getByRole('heading', { name: 'Add a Skill' })).toBeVisible()
  await expect(page.getByPlaceholder('https://skills.sh/owner/repo/skill')).toBeVisible()
  await expect(page.getByText('.agents/skills')).toBeVisible()
  await expect(page.getByText('.claude/skills')).toBeVisible()
})
