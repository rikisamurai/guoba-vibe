import { expect, test } from '@playwright/test'

test('入门课与 Lab 完成 ready → run-settled 跨应用闭环', async ({ page }) => {
  await page.goto('/learn/01-non-streaming-chat')

  const demo = page.getByRole('region', { name: '完整响应基线交互实验' })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await expect(frame.getByText('INPUT', { exact: true })).toBeVisible()
  await expect(frame.getByText('CHAT SNAPSHOT', { exact: true })).toBeVisible()
  await expect(frame.getByText('DISPLAYED', { exact: true })).toBeVisible()
  await expect(frame.getByText('TYPED EVENT', { exact: true })).toHaveCount(0)
  await frame.getByRole('button', { name: '播放 trace' }).click()

  await expect(demo.locator('output')).toHaveText('实验完成', { timeout: 15_000 })
  await expect(demo.getByText('已通过 2/2 项检查')).toBeVisible()
  await expect(demo.locator('.lesson-demo__checks li')).toHaveCount(2)
  await expect(demo.getByText('真实 fixture 已执行到可证明的终点')).toBeVisible()
  await expect(demo.getByText('非流式 Chat 先进入 waiting，再一次发布完整回复')).toBeVisible()
})

test('Quick Start 逐层观察 chunk、SSE event 与显示文本状态更新', async ({ page }) => {
  await page.goto('/reference/network-boundaries')

  const demo = page.getByRole('region', {
    name: '逐增量更新（M0）与合并更新（M4）交互实验',
  })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await frame.getByText('术语说明与来源', { exact: true }).click()
  await expect(frame.getByText('WHATWG Streams', { exact: true })).toBeVisible()
  await expect(frame.getByText('WHATWG HTML', { exact: true })).toBeVisible()
  await expect(frame.getByText('DeepSeek Chat Completions', { exact: true })).toBeVisible()
  await expect(frame.getByText('本课程模型', { exact: true })).toHaveCount(2)
  await expect(frame.getByText(/wire chunk|Engine publish|Render IR/i)).toHaveCount(0)

  const readNext = frame.getByRole('button', { name: '读取下一个 chunk' })
  await readNext.click()
  await readNext.click()
  await expect(frame.getByText('已读取 chunk').locator('..')).toContainText('2 /')
  await expect(frame.getByText('SSE events').locator('..')).toContainText('0')

  await readNext.click()
  await expect(frame.getByText('文本已经接收，但还没有全部显示')).toBeVisible()
  const pending = frame.getByText('等待显示', { exact: true }).locator('..')
  await expect(pending).toContainText(/\d+ 个字符/)
  const showAccepted = frame.getByRole('button', { name: '显示已接收文本' })
  await expect(showAccepted).toBeFocused()
  await showAccepted.click()
  await expect(frame.getByText('已接收文本现在已经显示')).toBeVisible()
  await expect(frame.getByText('等待显示', { exact: true }).locator('..')).toContainText('0 个字符')

  const finish = frame.getByRole('button', { name: '继续到完整回复' })
  await expect(finish).toBeFocused()
  await finish.click()
  await expect(demo.locator('output')).toHaveText('实验完成', { timeout: 10_000 })
  await expect(demo.getByText('已通过 4/4 项检查')).toBeVisible()
  await expect(demo.getByText('M4 产生更少的显示文本状态更新')).toBeVisible()

  await frame.getByRole('button', { name: '重新观察' }).click()
  await expect(demo.locator('output')).toHaveText('可以运行')
  await expect(demo.getByText('实验结束后，这里会核对本章检查项。')).toBeVisible()
})

test('通用 Lab 再次回放时清除上一轮课程结果', async ({ page }) => {
  await page.goto('/learn/10-m1-frame-batching')

  const demo = page.getByRole('region', { name: 'M1 帧批处理实验交互实验' })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.locator('output')).toHaveText('可以运行', { timeout: 10_000 })

  const frame = demo.frameLocator('iframe')
  await frame.getByRole('button', { name: '开始回放' }).click()
  await expect(demo.locator('output')).toHaveText('实验完成', { timeout: 10_000 })

  await frame.getByRole('button', { name: '开始回放' }).click()
  await frame.getByRole('button', { name: '暂停' }).click()
  await expect(demo.locator('output')).toHaveText('可以运行')
  await expect(demo.getByText('实验结束后，这里会核对本章检查项。')).toBeVisible()
})
