import { expect, test } from '@playwright/test'

const chapterRoutes = [
  ['/learn/quick-start', '快速起步：先看见 M0 与 M4 的差异'],
  ['/learn/deterministic-runtime', '确定性运行时：把时间变成依赖'],
  ['/learn/bytes-utf8', '字节到文本：守住 UTF-8 边界'],
  ['/learn/sse', 'SSE：从任意文本块还原事件'],
  ['/learn/protocols', '三种协议：归一化而不抹平语义'],
  ['/learn/m0', 'M0：建立全文重算基线'],
  ['/learn/m1', 'M1：分开 ingest 与 display clocks'],
  ['/learn/preview-repair', 'Preview repair：修补显示，不污染事实'],
  ['/learn/m2', 'M2：冻结稳定块'],
  ['/learn/m3', 'M3：只重解析有界尾部'],
  ['/learn/m4', 'M4：调度重型节点'],
  ['/learn/ship', 'Ship：把正确性、性能与安全一起交付'],
] as const

const routes = [
  ['/', '把流式回答拆成看得见的系统'],
  ...chapterRoutes,
  ['/lab', '流式渲染实验台'],
  ['/profiler', '把一次回答读成性能轨迹'],
  ['/repro/broken-fence', '最小复现：broken fence'],
  ['/chat', '真实聊天，保留实验仪表'],
  ['/bench', '可复现的渲染基准'],
] as const

test.describe('学习入口', () => {
  for (const [path, heading] of routes) {
    test(`${path} 有可识别的页面标题`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    })
  }
})

test('课程目录按路线展示 12 章', async ({ page }) => {
  await page.goto('/')

  const curriculum = page.getByRole('region', { name: '12 章流式渲染课程' })
  await expect(curriculum.getByRole('link')).toHaveCount(12)
  await expect(curriculum.getByRole('link').first()).toHaveAttribute('href', '/learn/quick-start')
  await expect(curriculum.getByRole('link').last()).toHaveAttribute('href', '/learn/ship')
})

test('课程页渲染 MDX 练习环并可继续下一章', async ({ page }) => {
  await page.goto('/learn/quick-start')

  await expect(page.getByRole('heading', { level: 2, name: '观察失败' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: '实现一个增量' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: '确定性验证' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Invariant、trade-off 与退化条件' }),
  ).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: '浏览器观察' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: '浏览器观察' })).toBeVisible()
  const inspector = page.getByRole('complementary', { name: '本章实时检查器' })
  await expect(inspector).toContainText('M4 · quick-start')
  await expect(inspector.getByText('settled', { exact: true })).toBeVisible()
  await expect(inspector.getByText('raw → visible p95')).toBeVisible()
  await expect(inspector.getByRole('link', { name: '在浏览器 Profiler 中观察' })).toHaveAttribute(
    'href',
    '/profiler',
  )
  await expect(page.getByRole('link', { name: '下一章：确定性运行时' })).toHaveAttribute(
    'href',
    '/learn/deterministic-runtime',
  )
})

test('主导航使用明确的可访问名称', async ({ page }) => {
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: '主导航' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link', { name: '课程', exact: true })).toHaveAttribute(
    'href',
    '/learn/quick-start',
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

test('实验台控件不依赖视觉标签表达含义', async ({ page }) => {
  await page.goto('/lab')

  await expect(page.getByRole('group', { name: '选择对照渲染阶段' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'M1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'M4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: '播放确定性样本' })).toBeVisible()
  await expect(page.getByRole('region', { name: '同一 trace 的 M0 与 M4 对比' })).toBeVisible()
})

test('实验台用真实 engine 完成 Replay drain', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: '播放确定性样本' }).click()

  await expect(page.getByRole('button', { name: '停止样本' })).toBeVisible()
  await expect(page.getByText('raw text', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('button', { name: '播放确定性样本' })).toBeVisible()
  await expect(page.locator('[data-profile="M0"] .output-heading')).toContainText('settled')
  await expect(page.locator('[data-profile="M4"] .output-heading')).toContainText('settled')
})

test('实验台停止操作发布 cancelled 终态', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: '播放确定性样本' }).click()
  await page.getByRole('button', { name: '停止样本' }).click()

  await expect(page.locator('[data-profile="M0"] .output-heading')).toContainText(
    'settled / cancelled',
  )
  await expect(page.locator('[data-profile="M4"] .output-heading')).toContainText(
    'settled / cancelled',
  )
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

test('性能页用真实 Replay 生成可重复采样', async ({ page }) => {
  await page.goto('/profiler')

  await expect(page.getByRole('status', { name: '性能采样状态' })).toContainText('settled', {
    timeout: 15_000,
  })
  await expect(page.getByRole('region', { name: '真实性能摘要' })).toContainText(
    'RAW → VISIBLE P95',
  )
  await expect(page.getByRole('region', { name: '真实性能摘要' })).toContainText('PARSE WORK')
  await expect(page.getByText('固定 Replay trace', { exact: false })).toBeVisible()
  await expect(
    page.locator('.metric').filter({ hasText: 'PARSE WORK' }).locator('strong'),
  ).toHaveText(/^[1-9]\d*$/)
  await expect(
    page.locator('.metric').filter({ hasText: 'REACT RENDER P95' }).locator('strong'),
  ).toHaveText(/^(?:<0\.01|(?!0\.00)\d+\.\d{2}) ms$/)
  await expect(page.locator('.metric').filter({ hasText: 'REACT RENDER P95' })).toContainText(
    /[1-9]\d* commits \/ 5 replays/,
  )

  await page.getByRole('button', { name: '重新采样' }).click()
  await expect(page.getByRole('button', { name: '采样中…' })).toBeDisabled()
  await expect(page.getByRole('status', { name: '性能采样状态' })).toContainText('settled', {
    timeout: 15_000,
  })
})

test('公共预览对真实聊天返回明确的 live_disabled', async ({ page }) => {
  await page.goto('/chat')
  await expect(page.getByText('DISABLED', { exact: true })).toBeVisible()
  await expect(page.getByText('PROTECTED', { exact: true })).toHaveCount(0)
  await expect(page.locator('details.chat-inspector')).not.toHaveAttribute('open', '')
  await page.getByLabel('输入实验问题').fill('解释 display clock')
  await page.getByRole('button', { name: '发送' }).click()

  await expect(page.getByText('live_disabled', { exact: true })).toBeVisible()
})

test('中宽屏展开 Chat inspector 仍保持纵向布局', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/chat')
  await page.locator('details.chat-inspector > summary').click()

  await expect(page.locator('details.chat-inspector')).toHaveCSS('display', 'block')
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
