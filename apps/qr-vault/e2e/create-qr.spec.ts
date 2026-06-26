import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('qr-vault:locale', 'en')
    window.localStorage.setItem('qr-vault:onboarding-v1', 'skipped')
  })
})

test('creates a QR code through the primary UI flow', async ({ page }) => {
  const title = `Playwright QR ${Date.now()}`
  const description = 'Created by qr-vault e2e'
  const url = 'https://example.com/products/qr-vault?source=e2e'

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible()

  await page.getByRole('link', { name: 'New QR' }).first().click()
  await expect(page).toHaveURL(/#\/new/)
  await expect(page.getByText('Untitled QR').first()).toBeVisible()

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Full URL').fill(url)
  await expect(page.getByRole('img', { name: title })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/#\/q\/[^?]+/)
  await expect(page.getByText('Saved QR')).toBeVisible()

  await page.getByRole('link', { name: 'Vault' }).first().click()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`${escapeRegExp(title)}.*example\\.com/products/qr-vault`),
    }),
  ).toBeVisible()
  await expect(page.getByText(description).first()).toBeVisible()
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
