import { expect, test } from '@playwright/test'

test('Lab 根路由重定向进入真实实验台', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/lab$/)
  await expect(
    page.getByRole('heading', { level: 1, name: '一条输入，拆开看每一层变化' }),
  ).toBeVisible()
})

test('主导航在 Course 与三个工具间划分责任', async ({ page }) => {
  await page.goto('/lab')

  const navigation = page.getByRole('navigation', { name: '主导航' })
  await expect(navigation.getByRole('link', { name: '课程', exact: true })).toHaveAttribute(
    'href',
    'http://localhost:5173',
  )
  await expect(navigation.getByRole('link', { name: '实验台', exact: true })).toHaveAttribute(
    'href',
    '/lab',
  )
  await expect(navigation.getByRole('link', { name: '性能分析', exact: true })).toHaveAttribute(
    'href',
    '/profiler',
  )
  await expect(navigation.getByRole('link', { name: '真实聊天', exact: true })).toHaveAttribute(
    'href',
    '/chat',
  )
})

test('实验台控件会真实改变同一次回放', async ({ page }) => {
  await page.goto('/lab?demo=m1&preset=m1-frame-batching')

  await expect(page.getByLabel('Baseline')).toHaveValue('M0')
  await expect(page.getByLabel('Challenger')).toHaveValue('M1')
  await expect(page.getByLabel('Transport')).toHaveValue('async-iterable')
  await page.getByRole('button', { name: '开始回放' }).click()
  await expect(page.locator('.lab2-tabs > span')).toHaveText('SETTLED', { timeout: 15_000 })
  await expect(page.locator('.lab2-rendered article')).toHaveCount(2)
  await expect(page.locator('.lab2-rendered .render-document')).toHaveCount(2)
})

test('实验台输入、高级参数、Inspector 与重置形成完整闭环', async ({ page }) => {
  await page.goto('/lab')

  const editor = page.getByLabel('INPUT · editable Markdown')
  await editor.fill('# 自定义输入\n\n**observable**')
  await page.getByText('高级设置').click()
  await page.getByLabel('Transport').selectOption('async-iterable')
  await page.getByLabel('Chunk min (bytes)').fill('3')
  await page.getByLabel('Chunk max (bytes)').fill('5')
  await page.getByLabel('Seed').fill('99')
  await page.getByRole('button', { name: '开始回放' }).click()

  await expect(page.locator('.lab2-tabs > span')).toHaveText('SETTLED', { timeout: 15_000 })
  await page.getByRole('tab', { name: 'IR / Blocks' }).click()
  await expect(page.getByText('M0 RENDER IR')).toBeVisible()
  await page.getByRole('tab', { name: 'Metrics' }).click()
  await expect(page.getByText('Engine commits', { exact: true })).toHaveCount(2)

  await page.getByRole('button', { name: '重置' }).click()
  await expect(page.locator('.lab2-tabs > span')).toHaveText('IDLE')
  await expect(editor).toHaveValue('# 自定义输入\n\n**observable**')
})

test('实验台支持暂停、单步与继续', async ({ page }) => {
  await page.goto('/lab?preset=sse-edge-cases')
  await page.getByRole('button', { name: '开始回放' }).click()
  await page.getByRole('button', { name: '暂停' }).click()
  const progress = page.locator('[aria-label^="回放进度"]')
  const before = await progress.getAttribute('aria-label')
  await page.getByRole('button', { name: '单步' }).click()
  await expect(progress).not.toHaveAttribute('aria-label', before ?? '')
  await page.getByRole('button', { name: '继续播放' }).click()
  await expect(page.locator('.lab2-tabs > span')).toHaveText('SETTLED', { timeout: 15_000 })
})

test('实验台可从 idle 直接单步启动并只放行一个 chunk', async ({ page }) => {
  await page.goto('/lab?preset=sse-edge-cases')

  const progress = page.locator('[aria-label^="回放进度"]')
  await page.getByRole('button', { name: '单步' }).click()

  await expect(page.getByRole('button', { name: '继续播放' })).toBeVisible()
  await expect(progress).toHaveAttribute('aria-label', /回放进度 1\//)
  await page.waitForTimeout(100)
  await expect(progress).toHaveAttribute('aria-label', /回放进度 1\//)
})

test('SSE preset 暴露 wire、decoded chunk、line 与 normalized event', async ({ page }) => {
  await page.goto('/lab?preset=sse-edge-cases')
  await page.getByRole('button', { name: '开始回放' }).click()
  await expect(page.locator('.lab2-tabs > span')).toHaveText('SETTLED', { timeout: 15_000 })
  await expect(page.getByText(/DECODED CHUNKS/)).toBeVisible()
  await expect(page.getByText('retry: 1200', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Events' }).click()
  await expect(page.getByText('response.start', { exact: true })).toBeVisible()
  await expect(page.getByText('response.end', { exact: true })).toBeVisible()
})

test('Course embed 使用 manifest preset 并可跳转完整 Lab', async ({ page }) => {
  await page.goto('/embed/sse?preset=sse-edge-cases')

  await expect(page.getByText('WHATWG SSE 边界实验', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '打开完整实验台 ↗' })).toHaveAttribute(
    'href',
    '/lab?demo=sse&preset=sse-edge-cases',
  )
  await expect(page.getByRole('button', { name: '播放 trace' })).toBeVisible()
  await expect(page.getByRole('button', { name: '重置' })).toBeVisible()
  await expect(page.getByLabel('arrival 与 visible 时间线')).toBeVisible()
  await expect(page.getByText('1 / 7', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '单步' }).click()
  await expect(page.getByText('2 / 7', { exact: true })).toBeVisible()
})

test('故障案例使用真实换行并完成 M0 与目标模式重放', async ({ page }) => {
  await page.goto('/repro/broken-fence')

  const raw = page.locator('.repro-code')
  await expect(raw).toContainText('```ts')
  expect(await raw.textContent()).toContain('```ts\nconst answer')
  expect(await raw.textContent()).not.toContain('\\n')

  const runner = page.getByRole('region', { name: 'broken fence 的 M0 与 M3 真实重放' })
  await runner.getByRole('button', { name: '播放确定性样本' }).click()
  await expect(runner.locator('[data-profile="M0"] .output-heading')).toContainText('settled')
  await expect(runner.locator('[data-profile="M3"] .output-heading')).toContainText('settled')
  await expect(runner.getByText('const answer = **42**', { exact: true })).toHaveCount(2)
})

test('split emoji 案例从真实 records 还原完整 grapheme', async ({ page }) => {
  await page.goto('/repro/split-emoji')

  const runner = page.getByRole('region', { name: 'split emoji 的 M0 与 M1 真实重放' })
  await runner.getByRole('button', { name: '播放确定性样本' }).click()
  await expect(runner.locator('[data-profile="M0"] .output-heading')).toContainText('settled')
  await expect(runner.locator('[data-profile="M1"] .output-heading')).toContainText('settled')
  await expect(runner.getByText('完成了：👩‍💻', { exact: true })).toHaveCount(2)
})

test('性能页保持 idle，显式开始后分开聚合与单次结果', async ({ page }) => {
  await page.goto('/profiler')

  await expect(page.getByText('尚未开始', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Fixture')).toHaveValue('mixed-markdown')
  await expect(page.getByLabel('内容规模')).toHaveValue('16')
  await expect(page.getByLabel('Warmup')).toHaveValue('1')
  await expect(page.getByLabel('Measurements')).toHaveValue('5')
  await expect(page.getByText('结果区仍为空', { exact: true })).toBeVisible()
  const developmentWarning = page.getByRole('note')
  if (await developmentWarning.count()) {
    await expect(developmentWarning).toContainText('development build')
  }

  await page.getByLabel('内容规模').selectOption('4')
  await page.getByLabel('Delta size').selectOption('192')
  await page.getByLabel('Warmup').selectOption('0')
  await page.getByLabel('Measurements').selectOption('3')
  await page.getByRole('button', { name: '开始 A/B 采样' }).click()
  await expect(page.getByRole('heading', { level: 2, name: /M1 .*重复工作/ })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('.profile-result-cards')).toContainText('RAW → VISIBLE P95')
  await expect(page.locator('.profile-lanes')).toContainText('最近一次 M1 时间线')
  await expect(page.locator('.profile-run-table')).toContainText('3 次测量')
  await expect(page.getByRole('button', { name: '重新采样' })).toBeVisible()
})

test('公共预览明确禁用真实聊天发送', async ({ page }) => {
  await page.goto('/chat')
  await expect(page.getByText('LIVE DISABLED', { exact: true })).toBeVisible()
  await expect(page.getByText('PROTECTED', { exact: true })).toHaveCount(0)
  await page.getByLabel('输入实验问题').fill('解释 display clock')
  await expect(page.getByRole('button', { name: '发送' })).toBeDisabled()
  await expect(page.locator('#live-disabled-reason')).toContainText('ENABLE_LIVE_API=1')
  await expect(page.getByRole('complementary', { name: '消息检查器' })).toBeVisible()
})

test('中宽屏 Chat inspector 保持纵向布局', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/chat')
  await expect(page.getByRole('complementary', { name: '消息检查器' })).toBeVisible()
  const columns = await page
    .locator('.chat-workspace')
    .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(1)
})

test('独立 Bench 入口可直接加载', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 })
  await page.goto('/bench-frame.html')

  await expect(page.getByRole('heading', { level: 1, name: '可复现的渲染基准' })).toBeVisible()
  await expect(page.getByRole('table', { name: '四种渲染策略的确定性样本对比' })).toBeVisible()
  await page.getByRole('button', { name: '运行工作量 Bench' }).click()
  await expect(page.getByRole('img', { name: /归一化增长曲线/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Bench 控制器通过 iframe 隔离独立文档', async ({ page }) => {
  await page.goto('/bench')
  const frame = page.frameLocator('iframe[title="Streaming Render 独立 Bench"]')
  await expect(frame.getByRole('heading', { level: 1, name: '可复现的渲染基准' })).toBeVisible()
  await expect(frame.getByRole('table', { name: '四种渲染策略的确定性样本对比' })).toBeVisible()
})
