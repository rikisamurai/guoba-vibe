import { expect, test } from '@playwright/test'

test('课程主线先真实 HTTP，项目切换来源后重新验收', async ({ page }) => {
  await page.goto('/learn/00-quick-start')
  const rail = page.getByRole('navigation', { name: '课程章节' })
  await expect(rail.getByRole('link', { name: /JavaScript/ })).toHaveCount(0)
  await rail.getByRole('link', { name: /A1.*HTTP：第一段数据从哪来/ }).click()
  await expect(page).toHaveURL(/\/learn\/a1-http$/)

  await page.goto('http://127.0.0.1:5274/project?source=mine')
  const checks = page.getByRole('region', { name: '当前实现验收' })
  await checks.getByRole('button', { name: '运行当前实现验收' }).click()
  await expect(checks.locator('output')).toContainText('我的实现')
  await expect(checks.getByText('src/my-chat/', { exact: true })).toBeVisible()
  await page.getByLabel('运行代码', { exact: true }).selectOption('reference')
  await expect(checks.locator('output')).toContainText('尚未运行')
  await checks.getByRole('button', { name: '运行当前实现验收' }).click()
  await expect(checks.locator('output')).toContainText('参考实现')
  await expect(checks.getByText('待修复', { exact: true })).toHaveCount(0)
})

test('快速开始先体验，并将正确性结果报告给课程', async ({ page }) => {
  await page.goto('/learn/00-quick-start')
  const demo = page.getByRole('region', { name: '完整返回与流式返回交互实验' })
  await demo.scrollIntoViewIfNeeded()
  const frame = demo.frameLocator('iframe')
  await frame.getByRole('button', { name: '单步', exact: true }).click()
  await expect(frame.getByText('等待完整回答…')).toBeVisible()
  await expect(frame.getByText('流式', { exact: true })).toBeVisible()
  await frame.getByRole('button', { name: '运行对比' }).click()
  await expect(demo.locator('output')).toHaveText('实验完成')
  await expect(demo.getByText('已通过 1/1 项检查')).toBeVisible()
  await frame.getByRole('button', { name: '重置', exact: true }).click()
  await expect(demo.locator('output')).toHaveText('可以运行')
})

test('SSE 实验改变切分与缺失空行会产生对应结果', async ({ page }) => {
  await page.goto('http://127.0.0.1:5274/playground?demo=sse-lab')
  await page.getByRole('button', { name: '读取下一段' }).click()
  await expect(page.getByText('尚无完整事件')).toBeVisible()
  await page.getByRole('button', { name: '读取下一段' }).click()
  await expect(page.getByText('{"text":"Hi"}', { exact: true })).toBeVisible()
  await page.getByLabel('故障：去掉结尾空行').check()
  await page.getByRole('button', { name: '读取下一段' }).click()
  await page.getByRole('button', { name: '读取下一段' }).click()
  await expect(page.getByText('尚无完整事件')).toBeVisible()
})

test('项目完成、截断、HTTP 错误与重试保留各轮结果', async ({ page }) => {
  await page.goto('http://127.0.0.1:5274/project?source=reference')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.locator('.project-turns').getByRole('status').last()).toHaveText('已完成')
  await expect(page.getByText('流式回答', { exact: true })).toBeVisible()
  await page.getByLabel('服务场景', { exact: true }).selectOption('truncated')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.locator('.project-turns').getByRole('status').last()).toHaveText(
    '连接中断，保留已收内容',
  )
  await page.getByLabel('服务场景', { exact: true }).selectOption('error')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.locator('.project-turns').getByRole('status').last()).toContainText('HTTP 503')
  await page.getByLabel('服务场景', { exact: true }).selectOption('stream')
  await page.getByRole('button', { name: '重试上一条' }).click()
  await expect(page.locator('.project-turns').getByRole('status').last()).toHaveText('已完成')
  await expect(page.locator('.project-turns > article')).toHaveCount(4)
})

test('停止后不再追加，移动端无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5274/project?source=reference')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.locator('.render-document').getByText('你好！', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '停止', exact: true }).click()
  await expect(page.locator('.project-turns').getByRole('status').last()).toHaveText(
    '已停止，保留已收内容',
  )
  const before = await page.locator('.render-document').innerText()
  await page.waitForTimeout(1800)
  await expect(page.locator('.render-document')).toHaveText(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
