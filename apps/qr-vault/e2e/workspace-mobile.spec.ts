import { expect, test } from '@playwright/test'

import { prepareEnglishVault, uniqueName } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await prepareEnglishVault(page)
})

test('keeps row metadata, actions, and delete feedback safe at mobile width', async ({ page }) => {
  const qrTitle = uniqueName('Mobile row QR')
  const collectionTitle =
    'Collection with an intentionally long name that must truncate before the action tray'

  await page.goto('/#/new?url=')
  await page.getByLabel('Title').fill(qrTitle)
  await page.getByLabel('Full URL').fill('https://example.com/mobile/row-regression?source=e2e')
  await page.getByRole('button', { name: 'New' }).click()
  await page.getByLabel('Collection name').fill(collectionTitle)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByLabel(collectionTitle)).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/#\/q\/[^?]+/)

  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('link', { name: 'Vault', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible()

  const row = page.locator('[data-slot="qr-list-item"]').filter({ hasText: qrTitle })
  const metadata = row.locator('[data-slot="qr-row-metadata"]')
  const actions = row.locator('[data-slot="qr-row-actions"]')
  const collectionBadge = row.locator('[data-slot="collection-meta-badge"]')
  await expect(row).toBeVisible()
  await expect(metadata).toContainText(collectionTitle)

  const [collectionBox, actionsBox] = await Promise.all([
    collectionBadge.boundingBox(),
    actions.boundingBox(),
  ])
  expect(collectionBox).not.toBeNull()
  expect(actionsBox).not.toBeNull()
  if (!collectionBox || !actionsBox) throw new Error('Expected row regions to have layout boxes')

  const overlapWidth = Math.max(
    0,
    Math.min(collectionBox.x + collectionBox.width, actionsBox.x + actionsBox.width) -
      Math.max(collectionBox.x, actionsBox.x),
  )
  const overlapHeight = Math.max(
    0,
    Math.min(collectionBox.y + collectionBox.height, actionsBox.y + actionsBox.height) -
      Math.max(collectionBox.y, actionsBox.y),
  )
  expect(overlapWidth * overlapHeight).toBe(0)
  expect(await metadata.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )

  const actionControls = actions.locator('button, a')
  await expect(actionControls).toHaveCount(3)
  const actionBoxes = await Promise.all(
    (await actionControls.all()).map((control) => control.boundingBox()),
  )
  for (const box of actionBoxes) {
    expect(box).not.toBeNull()
    expect(box?.width).toBeGreaterThanOrEqual(40)
    expect(box?.height).toBeGreaterThanOrEqual(40)
  }

  const collectionLabel = metadata.getByText(collectionTitle, { exact: true }).last()
  await expect(collectionLabel).toBeVisible()
  const truncation = await collectionLabel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(truncation.scrollWidth).toBeGreaterThan(truncation.clientWidth)

  await row.getByRole('button', { name: `Delete ${qrTitle}` }).click()
  await expect(row.getByRole('button', { name: `Confirm delete ${qrTitle}` })).toBeVisible()

  const progress = row.locator('[data-slot="armed-action-progress"]')
  await expect(progress).toBeVisible()
  const motionStyle = await progress.evaluate((element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element)
    if (!style) throw new Error('Expected progress to have computed styles')
    return {
      duration: style.animationDuration,
      timing: style.animationTimingFunction,
    }
  })
  expect(motionStyle).toEqual({ duration: '3s', timing: 'linear' })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedMotionStyle = await progress.evaluate((element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element)
    if (!style) throw new Error('Expected progress to have computed styles')
    return {
      animationName: style.animationName,
      transform: style.transform,
    }
  })
  expect(reducedMotionStyle).toEqual({ animationName: 'none', transform: 'none' })
})
