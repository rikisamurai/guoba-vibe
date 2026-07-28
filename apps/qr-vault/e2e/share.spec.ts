import { expect, test } from '@playwright/test'

import { escapeRegExp, prepareEnglishVault, uniqueName } from './helpers'

test.beforeEach(async ({ page }) => {
  await prepareEnglishVault(page)
})

test('opens web URLs in a new tab without sharing opener access', async ({ page }) => {
  await page.goto('/')
  const url = new URL('/', page.url()).toString()

  await page.goto(`/#/share?${new URLSearchParams({ url }).toString()}`)

  const openLink = page.getByRole('link', { name: 'Open link' })
  await expect(openLink).toHaveAttribute('href', url)
  await expect(openLink).toHaveAttribute('target', '_blank')
  await expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')

  const popupPromise = page.waitForEvent('popup')
  await openLink.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL(url)
  await popup.close()
})

test('hands app deep links to the current browsing context', async ({ page }) => {
  const url = 'xhsdiscover://xx'

  await page.goto(`/#/share?${new URLSearchParams({ url }).toString()}`)

  const openLink = page.getByRole('link', { name: 'Open link' })
  await expect(openLink).toHaveAttribute('href', url)
  expect(await openLink.getAttribute('target')).toBeNull()
  expect(await openLink.getAttribute('rel')).toBeNull()
})

test('does not expose unsafe URLs as links', async ({ page }) => {
  const url = 'javascript:alert(1)'

  await page.goto(`/#/share?${new URLSearchParams({ url }).toString()}`)

  await expect(page.getByRole('button', { name: 'Open link' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Open link' })).toHaveCount(0)
})

test('does not open schemeless URLs', async ({ page }) => {
  const url = 'www.google.com'

  await page.goto(`/#/share?${new URLSearchParams({ url }).toString()}`)

  await expect(page.getByRole('button', { name: 'Open link' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Open link' })).toHaveCount(0)
})

test('saves an incoming share to the local vault', async ({ page }) => {
  const title = uniqueName('Shared QR')
  const description = 'Saved from a share link'
  const url = 'https://example.com/shared/deeplink?source=e2e'
  const shareSearch = new URLSearchParams({ url, title, description })

  await page.goto(`/#/share?${shareSearch.toString()}`)

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('img', { name: title })).toBeVisible()
  await expect(page.getByText('Valid deep link')).toBeVisible()

  await page.getByRole('button', { name: 'Save to local' }).click()

  await expect(page).toHaveURL(/#\/q\/[^?]+/)
  await expect(page.getByLabel('Title')).toHaveValue(title)
  await expect(page.getByLabel('Description')).toHaveValue(description)
  await expect(page.getByLabel('Full URL')).toHaveValue(url)

  await page.evaluate(() => {
    const browserGlobal = globalThis as {
      localStorage: { setItem: (key: string, value: string) => void }
    }
    browserGlobal.localStorage.setItem(
      'qr-vault:data',
      JSON.stringify({ version: 1, qrs: [], collections: [], collectionItems: [] }),
    )
  })

  await page.getByRole('link', { name: 'Vault' }).first().click()
  const savedQr = page.getByRole('button', {
    name: new RegExp(`${escapeRegExp(title)}.*example\\.com/shared/deeplink`),
  })
  await expect(savedQr).toBeVisible()

  await page.getByRole('button', { name: `Delete ${title}` }).click()
  await page.getByRole('button', { name: `Confirm delete ${title}` }).click()
  await expect(savedQr).not.toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(savedQr).toBeVisible()
})
