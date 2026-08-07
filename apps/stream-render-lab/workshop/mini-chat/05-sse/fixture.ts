const SSE_WIRE = [
  '\uFEFF: heartbeat\r\n',
  'id: 7\r\n',
  'retry: 1500\r',
  'event: token\n',
  'data: {"text":"你"}\r\n',
  'data: {"text":"好"}\r\n',
  '\r\n',
  '\uFEFFdata: ignored\n',
  'data: plain\n\n',
  'id: 99',
].join('')

const encoded = new TextEncoder().encode(SSE_WIRE)

export const SSE_FIXTURE_CHUNKS = Array.from(encoded, (byte) => Uint8Array.of(byte))
