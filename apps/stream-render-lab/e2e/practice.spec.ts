import { expect, test } from '@playwright/test'

import { runAcceptance } from '../src/practice/checks'
import { implementations } from '../src/practice/implementations'

test('网络观测把真实 HTTP 读取联到四层数据，拆分与缓冲不改变参考正文', async ({ page }) => {
  await page.goto('/playground?demo=network-inspector&source=reference')
  const inspector = page.getByRole('region', { name: '网络观测' })
  const status = inspector.getByRole('status')
  const answer = inspector.locator('.network-answer pre')
  await expect(inspector.getByLabel('观测代码来源')).toHaveValue('reference')
  await inspector.getByRole('button', { name: '发起请求' }).click()
  await expect(status).toContainText('当前实现判定：completed')
  await expect(answer).toContainText('每一步都保留已经收到的文字。')
  const expectedAnswer = await answer.textContent()
  const firstRead = inspector.getByLabel('实际读取记录').getByRole('button').first()
  await firstRead.click()
  await expect(firstRead).toHaveAttribute('aria-pressed', 'true')
  const stages = inspector.getByLabel('所选读取的四层数据')
  await expect(stages.getByRole('heading', { level: 3 })).toHaveCount(4)
  await expect(stages.locator('section').first().locator('pre')).toHaveText(
    /^[0-9a-f]{2}( [0-9a-f]{2})*$/,
  )

  // oxlint-disable no-await-in-loop -- change and observe one UI scenario before the next
  for (const mode of ['split', 'buffered']) {
    await inspector.getByLabel('HTTP 场景').selectOption(mode)
    await expect(status).toContainText('尚未请求')
    await expect(inspector.getByLabel('实际读取记录')).toHaveCount(0)
    await inspector.getByRole('button', { name: '发起请求' }).click()
    await expect(status).toContainText('当前实现判定：completed')
    await expect(answer).toHaveText(expectedAnswer ?? '')
    await expect(answer).not.toContainText('�')
  }
  // oxlint-enable no-await-in-loop
})

test('截断 EOF 显示为独立冲刷，切换实现不会沿用旧结果', async ({ page }) => {
  await page.goto('/playground?demo=network-inspector&source=reference')
  const inspector = page.getByRole('region', { name: '网络观测' })
  await inspector.getByLabel('HTTP 场景').selectOption('truncated')
  await inspector.getByRole('button', { name: '发起请求' }).click()
  await expect(inspector.getByRole('status')).toContainText('当前实现判定：truncated · eof')
  await expect(inspector.locator('.network-answer pre')).toContainText('你好！')
  await expect(inspector.locator('.network-answer pre')).not.toContainText('每一步都保留')
  const eof = inspector.getByRole('button', { name: /EOF · 冲刷/ })
  await eof.click()
  await expect(eof).toHaveAttribute('aria-pressed', 'true')
  await expect(inspector.getByLabel('所选读取的四层数据')).toContainText('EOF 没有新的字节')

  await inspector.getByLabel('观测代码来源').selectOption('mine')
  await expect(inspector).toContainText('当前代码：src/my-chat/')
  await expect(inspector.getByRole('status')).toContainText('尚未请求')
  await expect(inspector.getByLabel('实际读取记录')).toHaveCount(0)
  await expect(inspector.locator('.network-answer pre')).toHaveText('还没有正文')
})

test('Mini Chat 的当前代码、浏览器验收与网络入口保持同一来源', async ({ page }) => {
  // Evaluate today's learner files: completing an exercise must not break this test.
  const mineChecks = await runAcceptance(implementations.mine)
  const passed = mineChecks.filter((check) => check.passed).length
  await page.goto('/project?source=mine')
  const acceptance = page.getByRole('region', { name: '当前实现验收' })
  await expect(page.getByRole('region', { name: '实现来源' })).toContainText('src/my-chat/')
  await acceptance.getByRole('button', { name: '运行当前实现验收' }).click()
  await expect(acceptance.locator('output')).toHaveText(
    `已通过 ${passed}/${mineChecks.length} 项 · 我的实现`,
  )
  await expect(acceptance.locator('.practice-checks li')).toHaveCount(mineChecks.length)
  expect(await acceptance.locator('.practice-checks small').allTextContents()).toEqual(
    mineChecks.map((check) => `src/my-chat/${check.file}`),
  )

  await page.getByLabel('运行代码', { exact: true }).selectOption('reference')
  await expect(page).toHaveURL(/source=reference/)
  await expect(acceptance.locator('output')).toContainText('尚未运行')
  await acceptance.getByRole('button', { name: '运行当前实现验收' }).click()
  await expect(acceptance.locator('output')).toHaveText(
    `已通过 ${mineChecks.length}/${mineChecks.length} 项 · 参考实现`,
  )
  const chat = page.getByRole('region', { name: '教学聊天项目' })
  await chat.getByLabel('服务场景').selectOption('buffered')
  await chat.getByRole('button', { name: '发送', exact: true }).click()
  await expect(chat.getByRole('heading', { name: '教学助手 · 参考实现' })).toBeVisible()
  await expect(chat.getByRole('status')).toContainText('已完成')
  await expect(chat.locator('.render-document')).toContainText('每一步都保留已经收到的文字。')
  await page.getByRole('link', { name: '逐次观察网络数据 →' }).click()
  await expect(page).toHaveURL(/source=reference/)
  await expect(page.getByLabel('观测代码来源')).toHaveValue('reference')
})
