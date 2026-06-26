import { expect, test } from '@playwright/test'

import { escapeRegExp, prepareEnglishVault, uniqueName } from './helpers'

test.beforeEach(async ({ page }) => {
  await prepareEnglishVault(page)
})

test('creates a collection while editing a QR and shows the assigned QR in that collection', async ({
  page,
}) => {
  const qrTitle = uniqueName('Collection QR')
  const collectionTitle = uniqueName('E2E Collection')
  const url = 'https://example.com/collections/member?source=e2e'

  await page.goto('/#/new?url=')

  await page.getByLabel('Title').fill(qrTitle)
  await page.getByLabel('Full URL').fill(url)
  await page.getByRole('button', { name: 'New' }).click()
  await page.getByLabel('Collection name').fill(collectionTitle)
  await page.getByRole('button', { name: 'Create' }).click()

  await expect(page.getByLabel(collectionTitle)).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/#\/q\/[^?]+/)

  await page.getByRole('link', { name: 'Collections' }).click()
  await page.getByRole('link', { name: new RegExp(escapeRegExp(collectionTitle)) }).click()

  await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(escapeRegExp(qrTitle)) })).toBeVisible()
})
