import { RENDERERS } from '../lib/renderers'
import type { RendererId } from '../lib/renderers'
import type { UiMessage } from '../lib/use-stream-session'

export function MessageItem({ message, renderer }: { message: UiMessage; renderer: RendererId }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    )
  }

  const { Component } = RENDERERS[renderer]
  return (
    <div className="max-w-full">
      {message.reasoning !== '' && (
        <details className="mb-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-400">
          <summary className="cursor-pointer select-none">
            思考过程（{message.reasoning.length} 字符）
          </summary>
          <div className="mt-2 whitespace-pre-wrap">{message.reasoning}</div>
        </details>
      )}
      <Component
        text={message.text}
        streaming={message.status === 'streaming'}
        className="prose prose-invert prose-sm prose-pre:bg-neutral-900 max-w-none"
      />
      <StatusLine message={message} />
    </div>
  )
}

function StatusLine({ message }: { message: UiMessage }) {
  if (message.status === 'streaming') {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
        <span className="inline-block h-3 w-1.5 animate-pulse bg-indigo-400" />
        生成中…
      </div>
    )
  }
  if (message.status === 'cancelled') {
    return <div className="mt-1 text-xs text-neutral-500">已停止</div>
  }
  if (message.status === 'error') {
    return <div className="mt-1 text-xs text-red-400">出错：{message.error}</div>
  }
  return null
}
