import type { PracticeCheck } from './checks'

export function fixtureResponse(chunks: Uint8Array[], status = 200): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    }),
    { status, headers: { 'Content-Type': 'text/event-stream' } },
  )
}
export const teachingPacket = 'data: {"choices":[{"index":0,"delta":{"content":"你好"}}]}\n\n'
const encode = (text: string) => new TextEncoder().encode(text)
export const lifecycleChecks: PracticeCheck[] = [
  {
    id: 'lifecycle-complete',
    group: 'lifecycle',
    title: '正常终态且保留完整正文',
    file: 'read-answer.ts',
    expected: ['你好', 'completed'],
    async run(impl) {
      let text = ''
      const outcome = await impl.readAnswer(
        fixtureResponse([encode(teachingPacket + 'data: [DONE]\n\n')]),
        {
          signal: new AbortController().signal,
          onText: (delta) => {
            text += delta
          },
        },
      )
      return [text, outcome.kind]
    },
  },
  {
    id: 'lifecycle-truncated',
    group: 'lifecycle',
    title: '无结束标记的 EOF 保留正文并报告截断',
    file: 'read-answer.ts',
    expected: ['你好', 'truncated'],
    async run(impl) {
      let text = ''
      const outcome = await impl.readAnswer(fixtureResponse([encode(teachingPacket)]), {
        signal: new AbortController().signal,
        onText: (delta) => {
          text += delta
        },
      })
      return [text, outcome.kind]
    },
  },
  {
    id: 'lifecycle-abort',
    group: 'lifecycle',
    title: '等待下一段时停止并释放 reader',
    file: 'read-answer.ts',
    expected: ['你好', true, false],
    async run(impl) {
      const controller = new AbortController()
      let cancelled = false
      let text = ''
      const body = new ReadableStream<Uint8Array>({
        start(stream) {
          stream.enqueue(encode(teachingPacket))
        },
        cancel() {
          cancelled = true
        },
      })
      try {
        await impl.readAnswer(
          new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
          {
            signal: controller.signal,
            onText(delta) {
              text += delta
              controller.abort()
            },
          },
        )
      } catch (error) {
        if (!controller.signal.aborted) throw error
      }
      return [text, cancelled, body.locked]
    },
  },
  {
    id: 'lifecycle-http',
    group: 'lifecycle',
    title: 'HTTP 503 不作为正文显示',
    file: 'read-answer.ts',
    expected: true,
    async run(impl) {
      let received = ''
      try {
        await impl.readAnswer(fixtureResponse([encode('unavailable')], 503), {
          signal: new AbortController().signal,
          onText: (text) => {
            received += text
          },
        })
      } catch (error) {
        return received === '' && error instanceof Error && error.message.includes('503')
      }
      return false
    },
  },
]
