import { expect, test } from '@playwright/test'

test('入门课与 Lab 完成 ready → run-settled 跨应用闭环', async ({ page }) => {
  await page.goto('/learn/01-non-streaming-chat')

  const demo = page.getByRole('region', { name: '完整响应基线交互实验' })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await frame.getByRole('button', { name: '播放 trace' }).click()

  await expect(demo.locator('output')).toHaveText('completed', { timeout: 15_000 })
  await expect(demo.getByText('2/2 checks')).toBeVisible()
  await expect(demo.locator('.lesson-demo__checks li')).toHaveCount(2)
  await expect(demo.getByText('真实 fixture 已执行到可证明的终点')).toBeVisible()
  await expect(demo.getByText('Static Chat solution 产出 fixture 约定的完整回复')).toBeVisible()
})

test('Quick Start 首屏展示真实时间对照并恢复 4/4 invariant', async ({ page }) => {
  await page.goto('/learn/00-quick-start')

  const demo = page.getByRole('region', { name: 'M0 与 M4 对照交互实验' })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await expect(frame.getByText('ARRIVAL CLOCK', { exact: true })).toBeVisible()
  await expect(frame.getByText('M0 Engine publish', { exact: true })).toBeVisible()
  await expect(frame.getByText('M4 Engine publish', { exact: true })).toBeVisible()
  await expect(frame.locator('.lesson-compare__pipeline')).toHaveCount(2)
  await expect(frame.locator('textarea')).toHaveCount(0)

  await frame.getByRole('button', { name: '开始回放' }).click()
  await expect(frame.getByRole('button', { name: '暂停' })).toBeVisible()
  await expect(demo.locator('output')).toHaveText('completed', { timeout: 10_000 })
  await expect(demo.getByText('4/4 checks')).toBeVisible()
  await expect(demo.getByText('M4 的 commit 数少于 M0')).toBeVisible()
})
