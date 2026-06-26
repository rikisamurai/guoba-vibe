import { expect, test } from '@playwright/test'

import { escapeRegExp, prepareEnglishVault, uniqueName } from './helpers'

test.beforeEach(async ({ page }) => {
  await prepareEnglishVault(page)
})

test('replaces local data from a vault JSON import', async ({ page }) => {
  const now = new Date().toISOString()
  const qrTitle = uniqueName('Imported QR')
  const collectionTitle = uniqueName('Imported Collection')
  const url = 'https://example.com/imported?source=e2e'
  const fileName = 'qr-vault-import-e2e.json'
  const vault = {
    version: 1,
    qrs: [
      {
        id: 'e2e-imported-qr',
        title: qrTitle,
        description: 'Imported through e2e',
        url,
        createdAt: now,
        updatedAt: now,
      },
    ],
    collections: [
      {
        id: 'e2e-imported-collection',
        title: collectionTitle,
        createdAt: now,
        updatedAt: now,
      },
    ],
    collectionItems: [{ collectionId: 'e2e-imported-collection', qrId: 'e2e-imported-qr' }],
  }

  await page.goto('/#/import')
  await page.getByLabel('Choose vault JSON file').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(vault)),
  })

  await expect(page.getByText('Loaded 1 QR codes and 1 collections.')).toBeVisible()
  await page.getByRole('button', { name: 'Replace local data' }).click()
  await page.getByRole('button', { name: 'Confirm replace local data' }).click()
  await expect(page.getByText(`Replaced local data with ${fileName}.`)).toBeVisible()

  await page.getByRole('link', { name: 'Vault', exact: true }).click()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`${escapeRegExp(qrTitle)}.*example\\.com/imported`),
    }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Collections', exact: true }).click()
  await expect(
    page.getByRole('link', { name: new RegExp(escapeRegExp(collectionTitle)) }),
  ).toBeVisible()
})
