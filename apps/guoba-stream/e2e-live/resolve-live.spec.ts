import { expect, test, type Page } from '@playwright/test'

import type { ResolvedTweet } from '../lib/types'
import { LIVE_ACCESS_KEY } from './environment'

const SAMPLES = [
  {
    name: 'public video post',
    url: 'https://x.com/elonmusk/status/1585341984679469056',
    tweetId: '1585341984679469056',
    authorHandle: 'elonmusk',
  },
  {
    name: 'sensitive video post',
    url: 'https://x.com/chenbao11522/status/2070505379432456331',
    tweetId: '2070505379432456331',
    authorHandle: 'chenbao11522',
  },
] as const

function hasTweet(value: unknown): value is { tweet: ResolvedTweet } {
  return typeof value === 'object' && value !== null && 'tweet' in value
}

async function unlock(page: Page): Promise<void> {
  await page.goto('/')
  const pingResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === '/api/resolve' && url.searchParams.get('ping') === '1'
  })
  await page.getByPlaceholder('Access code').fill(LIVE_ACCESS_KEY)
  await page.getByRole('button', { name: 'Unlock' }).click()
  expect((await pingResponse).status()).toBe(204)
  await expect(page.getByPlaceholder('https://x.com/…/status/…')).toBeVisible()
}

for (const sample of SAMPLES) {
  test(`resolves a live ${sample.name}`, async ({ page }) => {
    await unlock(page)
    const resolveResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname === '/api/resolve' && url.searchParams.has('url')
    })

    await page.getByPlaceholder('https://x.com/…/status/…').fill(sample.url)
    await page.getByRole('button', { name: 'Fetch' }).click()

    const response = await resolveResponse
    expect(response.status()).toBe(200)
    const body = await response.json()
    if (!hasTweet(body)) throw new Error('expected tweet in live resolve response')
    expect(body.tweet.id).toBe(sample.tweetId)
    expect(body.tweet.authorHandle).toBe(sample.authorHandle)
    expect(body.tweet.media.length).toBeGreaterThan(0)
    expect(body.tweet.media[0].variants.length).toBeGreaterThan(0)
    expect(body.tweet.media[0].variants[0].label).not.toBe('')
    expect(body.tweet.media[0].variants[0].rawUrl).toMatch(/^https:\/\/video\.twimg\.com\//)
    expect(body.tweet.media[0].variants[0].downloadUrl).toContain('/api/download?')

    await expect(page.getByText(`@${sample.authorHandle}`)).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(body.tweet.media.length)
    await expect(page.getByRole('button', { name: 'Play preview' }).first()).toBeVisible()
    const resultImages = page.locator('section img, article img')
    await expect(resultImages).toHaveCount(body.tweet.media.length + 1)
    await expect
      .poll(() =>
        resultImages.evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
      )
      .toBe(true)
    await expect(page.getByRole('link', { name: 'Save' }).first()).toHaveAttribute(
      'href',
      /\/api\/download\?/,
    )
  })
}
