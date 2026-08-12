import { expect, test, type Page } from '@playwright/test'

import { ACCESS_KEY, RESOLVED_TWEET } from './fixtures'

const TWEET_URL = 'https://x.com/sana_films/status/1585341984679469056?s=46&t=track'

async function seedAccessKey(page: Page) {
  await page.addInitScript(
    ([key]) => localStorage.setItem('guoba-stream:access-key', key),
    [ACCESS_KEY],
  )
}

test('gate blocks until a valid code is entered', async ({ page }) => {
  await page.route('**/api/resolve*', (route) => {
    const ok = route.request().headers()['x-access-key'] === ACCESS_KEY
    void route.fulfill(
      ok ? { status: 204, body: '' } : { status: 401, json: { error: 'unauthorized' } },
    )
  })
  await page.goto('/')
  await page.getByPlaceholder('Access code').fill('wrong')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByText("That code didn't work")).toBeVisible()
  await page.getByPlaceholder('Access code').fill(ACCESS_KEY)
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByPlaceholder('https://x.com/…/status/…')).toBeVisible()
})

test('clears a pasted URL during fetch without cancelling the result', async ({ page }) => {
  await seedAccessKey(page)
  let releaseResolve!: () => void
  const resolveAllowed = new Promise<void>((resolve) => {
    releaseResolve = resolve
  })
  await page.route('**/api/resolve*', async (route) => {
    await resolveAllowed
    await route.fulfill({ json: RESOLVED_TWEET })
  })
  await page.goto('/')

  const input = page.getByPlaceholder('https://x.com/…/status/…')
  const clearButton = page.getByRole('button', { name: 'Clear URL' })
  await expect(clearButton).toHaveCount(0)
  await input.fill(TWEET_URL)
  await expect(clearButton).toBeVisible()

  const fetchButton = page.getByRole('button', { name: 'Fetch' })
  await fetchButton.click()
  await expect(fetchButton).toBeDisabled()
  await clearButton.click()

  const labelledInput = page.getByRole('textbox', { name: 'Tweet URL' })
  await expect(labelledInput).toHaveValue('')
  await expect(labelledInput).toBeFocused()
  await expect(clearButton).toHaveCount(0)

  releaseResolve()
  await expect(page.getByText('@sana_films')).toBeVisible()
})

test('resolves a post into selectable media cards', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) => route.fulfill({ json: RESOLVED_TWEET }))
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()

  await expect(page.getByText('@sana_films')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByText('GIF', { exact: true })).toBeVisible()
  await expect(page.getByText('0:42')).toBeVisible()
  await expect(page.getByText('3 of 3 selected')).toBeVisible()

  const quality = page.getByLabel('Quality').first()
  await expect(quality).toHaveValue('0')
  await quality.selectOption('1')
  await expect(page.getByRole('link', { name: 'Open raw link' }).first()).toHaveAttribute(
    'href',
    /v360/,
  )

  await page.getByRole('button', { name: 'Deselect' }).first().click()
  await expect(page.getByText('2 of 3 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download 2 files' })).toBeVisible()

  const save = page.getByRole('link', { name: 'Save' }).first()
  await expect(save).toHaveAttribute('href', /\/api\/download\?/)
})

test('shows a friendly error for restricted posts', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) =>
    route.fulfill({ status: 404, json: { error: 'restricted' } }),
  )
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByText("This post is restricted or deleted — can't fetch it")).toBeVisible()
})

test('kicks back to the gate when the key is revoked', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  )
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByPlaceholder('Access code')).toBeVisible()
})
