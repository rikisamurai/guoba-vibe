import { expect, test } from '@playwright/test'

test('Course 与 Lab 完成 ready → run-settled 跨应用闭环', async ({ page }) => {
  await page.goto('/learn/01-quick-start')

  const demo = page.getByRole('region', { name: 'M0 与 M4 对照交互实验' })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await frame.getByRole('button', { name: '开始回放' }).click()

  await expect(demo.locator('output')).toHaveText('completed', { timeout: 15_000 })
  await expect(demo.getByText('4/4 checks')).toBeVisible()
  await expect(demo.locator('.lesson-demo__checks li')).toHaveCount(4)
  await expect(demo.getByText('两条 pipeline 都进入 settled')).toBeVisible()
  await expect(demo.getByText('M0 与 M4 的终态 Render IR 等价')).toBeVisible()
})
