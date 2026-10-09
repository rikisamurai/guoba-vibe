import { expect, test, type Page } from '@playwright/test'

const WIRES = {
  'chat-completions': [
    'data: {"id":"c","choices":[{"index":0,"delta":{"reasoning_content":"think"}}]}\n\n',
    'data: {"id":"c","choices":[{"index":0,"delta":{"content":"hello"}}]}\n\n',
    'data: {"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    'data: [DONE]\n\n',
  ],
  responses: [
    'event: response.created\ndata: {"type":"response.created","sequence_number":0,"response":{"id":"r"}}\n\n',
    'event: response.reasoning_text.delta\ndata: {"type":"response.reasoning_text.delta","sequence_number":1,"item_id":"reason","output_index":0,"content_index":0,"delta":"think"}\n\n',
    'event: response.reasoning_text.done\ndata: {"type":"response.reasoning_text.done","sequence_number":2,"item_id":"reason","output_index":0,"content_index":0}\n\n',
    'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","sequence_number":3,"item_id":"answer","output_index":1,"content_index":0,"delta":"hello"}\n\n',
    'event: response.output_text.done\ndata: {"type":"response.output_text.done","sequence_number":4,"item_id":"answer","output_index":1,"content_index":0}\n\n',
    'event: response.completed\ndata: {"type":"response.completed","sequence_number":5,"response":{"id":"r"}}\n\n',
  ],
  anthropic: [
    'event: message_start\ndata: {"type":"message_start","message":{"id":"m"}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","id":"reason"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"think"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","id":"answer"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"hello"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  ],
} as const

const PROTOCOLS = [
  ['chat-completions', 'OpenAI Chat Completions'],
  ['responses', 'OpenAI Responses'],
  ['anthropic', 'Anthropic Messages'],
] as const

for (const [protocol] of PROTOCOLS) {
  test(`${protocol} wire reaches reasoning, answer and settled React UI`, async ({ page }) => {
    await installMockDeepSeek(page)
    await page.goto('/chat')
    await page.getByLabel('Protocol').selectOption(protocol)
    await page.getByLabel('输入实验问题').fill('hello')
    await page.getByRole('button', { name: '发送' }).click()

    const run = page.locator('.chat-run').last()
    await expect(run.locator('.chat-reasoning')).toContainText('think')
    await expect(run.locator('.chat-answer')).toContainText('hello')
    await expect(run.locator('.chat-run__status')).toContainText('completed')
    await expect(page.locator('.chat-lifecycle li[data-state="done"]')).toHaveCount(7)
  })
}

test('Chat supports Copy raw and Retry after a settled run', async ({ page }) => {
  await installMockDeepSeek(page)
  await page.goto('/chat')
  await page.getByLabel('输入实验问题').fill('hello')
  await page.getByRole('button', { name: '发送' }).click()

  const first = page.locator('.chat-run').first()
  await expect(first.locator('.chat-run__status')).toContainText('completed')
  const firstHeader = await first.locator('.chat-run__header small').textContent()
  await first.getByRole('button', { name: '复制 raw' }).click()
  await expect(first.getByRole('button', { name: '已复制' })).toBeVisible()
  expect(
    await page.evaluate(
      () => (window as Window & { streamRenderCopiedRaw?: string }).streamRenderCopiedRaw,
    ),
  ).toBe('thinkhello')

  await first.getByRole('button', { name: '重试' }).click()
  const retried = page.locator('.chat-run').last()
  await expect(retried.locator('.chat-run__status')).toContainText('completed')
  expect(await retried.locator('.chat-run__header small').textContent()).not.toBe(firstHeader)
  expect(
    await page.evaluate(
      () => (window as Window & { streamRenderChatRequests?: number }).streamRenderChatRequests,
    ),
  ).toBe(2)
})

test('Stop settles as cancelled and preserves accepted raw', async ({ page }) => {
  await installMockDeepSeek(page, true)
  await page.goto('/chat')
  await page.getByLabel('Protocol').selectOption('chat-completions')
  await page.getByLabel('输入实验问题').fill('hello')
  await page.getByRole('button', { name: '发送' }).click()

  const run = page.locator('.chat-run').last()
  await expect(run.locator('.chat-answer')).toContainText('hello')
  await page.getByRole('button', { name: '停止生成' }).click()
  await expect(run.locator('.chat-run__status')).toContainText('cancelled · user')
  await expect(run.locator('.chat-answer')).toContainText('hello')
})

async function installMockDeepSeek(page: Page, slow = false): Promise<void> {
  await page.addInitScript(
    ({ protocolWires, useSlowStream }) => {
      const nativeFetch = window.fetch.bind(window)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            ;(window as Window & { streamRenderCopiedRaw?: string }).streamRenderCopiedRaw = value
          },
        },
      })
      window.fetch = async (input, init) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.endsWith('/api/capabilities')) {
          return Response.json({ capability: { kind: 'enabled' } })
        }
        if (!url.endsWith('/api/chat')) return nativeFetch(input, init)

        const state = window as Window & { streamRenderChatRequests?: number }
        state.streamRenderChatRequests = (state.streamRenderChatRequests ?? 0) + 1
        const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
        if (typeof body !== 'object' || body === null) throw new TypeError('missing protocol')
        const protocol = 'protocol' in body ? body.protocol : undefined
        if (
          protocol !== 'chat-completions' &&
          protocol !== 'responses' &&
          protocol !== 'anthropic'
        ) {
          throw new TypeError('unknown protocol')
        }
        const frames = [...protocolWires[protocol]]
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            const immediate = useSlowStream ? frames.slice(0, 2) : frames
            immediate.forEach((frame) => controller.enqueue(encoder.encode(frame)))
            if (!useSlowStream) {
              controller.close()
              return
            }
            const timer = window.setTimeout(() => {
              frames.slice(2).forEach((frame) => controller.enqueue(encoder.encode(frame)))
              controller.close()
            }, 10_000)
            init?.signal?.addEventListener(
              'abort',
              () => {
                window.clearTimeout(timer)
                controller.close()
              },
              { once: true },
            )
          },
        })
        return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
      }
    },
    { protocolWires: WIRES, useSlowStream: slow },
  )
}
