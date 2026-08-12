const CHAT_COMPLETIONS_WIRE = [
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"先想"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"再答"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: [DONE]\n\n',
].join('')

const encoded = new TextEncoder().encode(CHAT_COMPLETIONS_WIRE)
const splitPoints = [1, 4, 11, 23, 47, 83, 131, 197, encoded.length]

export const CHAT_COMPLETIONS_FIXTURE_CHUNKS = splitPoints.map((end, index) =>
  encoded.slice(splitPoints[index - 1] ?? 0, end),
)
