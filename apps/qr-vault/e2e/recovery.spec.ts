import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { prepareEnglishVault } from './helpers'

const timestamp = '2026-07-21T00:00:00.000Z'
const baselineVault = {
  version: 1,
  qrs: [
    {
      id: 'baseline-qr',
      title: 'Baseline QR',
      url: 'https://example.com/baseline',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  collections: [],
  collectionItems: [],
}
const invalidVault = {
  ...baselineVault,
  qrs: [{ ...baselineVault.qrs[0], description: { unsafe: true } }],
}
const invalidRaw = JSON.stringify(invalidVault, null, 2)

test('downloads the exact unreadable data before resetting to an empty Vault', async ({ page }) => {
  await prepareEnglishVault(page, invalidRaw)
  await page.goto('/#/new?url=https://example.com')

  await expect(page.getByRole('heading', { name: 'Local data needs recovery' })).toBeVisible()
  await expect(page.getByText('qr-vault:data', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Validation issues' })).toContainText(
    '$.qrs[0].description',
  )
  await expect(page.getByRole('button', { name: 'Vault', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Full URL')).toHaveCount(0)

  await page.getByRole('button', { name: 'Reset local vault' }).click()
  expect(await page.evaluate(() => localStorage.getItem('qr-vault:data'))).toBe(invalidRaw)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download original data and reset' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('qr-vault-recovery-original.json')
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error('expected downloaded recovery file')
  expect(await readFile(downloadPath, 'utf8')).toBe(invalidRaw)

  await expect(page).toHaveURL(/\/#\/$/)
  await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible()
  await expect(page.getByText('Empty vault')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qr-vault:data')!))).toEqual({
    version: 1,
    qrs: [],
    collections: [],
    collectionItems: [],
  })
})

test('restores a corrected file before unlocking the normal Vault', async ({ page }) => {
  await prepareEnglishVault(page, invalidRaw)
  await page.goto('/')
  const repairedVault = {
    ...baselineVault,
    qrs: [{ ...baselineVault.qrs[0], title: 'Recovered QR' }],
    extension: { source: 'manual-repair' },
  }

  await page.getByLabel('Choose corrected JSON file').setInputFiles({
    name: 'corrected-vault.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(repairedVault)),
  })
  await expect(page.getByRole('status')).toContainText('This file is valid and ready to use.')
  await page.getByRole('button', { name: 'Use corrected file' }).click()

  await expect(page).toHaveURL(/\/#\/$/)
  await expect(
    page.getByRole('button', { name: /Recovered QR.*example\.com\/baseline/ }),
  ).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qr-vault:data')!))).toEqual(
    repairedVault,
  )
})

test('shows detailed Import issues without changing the current Vault', async ({ page }) => {
  const baselineRaw = JSON.stringify(baselineVault, null, 2)
  await prepareEnglishVault(page, baselineRaw)
  await page.goto('/#/import')
  const before = await page.evaluate(() => localStorage.getItem('qr-vault:data'))

  await page.getByLabel('Choose vault JSON file').setInputFiles({
    name: 'invalid-vault.json',
    mimeType: 'application/json',
    buffer: Buffer.from(invalidRaw),
  })

  await expect(page.getByRole('alert')).toContainText(
    'This file is not valid QR Vault data. Local data was not changed.',
  )
  await expect(page.getByRole('list', { name: 'Validation issues' })).toContainText(
    '$.qrs[0].description',
  )
  await expect(page.getByRole('button', { name: 'Merge into local' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Replace local data' })).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem('qr-vault:data'))).toBe(before)

  await page.getByRole('link', { name: 'Vault', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /Baseline QR.*example\.com\/baseline/ }),
  ).toBeVisible()
})
