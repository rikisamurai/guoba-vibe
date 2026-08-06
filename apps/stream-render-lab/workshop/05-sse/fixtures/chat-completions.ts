export const CHAT_COMPLETIONS_WIRE = [
  '\uFEFF: keep-alive\r\n',
  'retry: 900\r\n\r\n',
  'event: delta\r',
  'id: 7\n',
  'data: {"id":"lesson",\r\n',
  'data: "choices":[{"index":0,"delta":{"content":"你🙂"}}]}\r\n\r\n',
  'data: [DONE]\n\n',
  'data: discarded at eof',
].join('')
