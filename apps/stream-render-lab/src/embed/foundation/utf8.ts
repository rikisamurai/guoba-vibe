// Reference protocol steps for the embedded A-route demos.
export const UTF8_FIXTURE_TEXT = '你好，👋 streaming'

const encoded = new TextEncoder().encode(UTF8_FIXTURE_TEXT)

export const UTF8_FIXTURE_CHUNKS = Array.from(encoded, (byte) => Uint8Array.of(byte))

export interface Utf8DecodeStep {
  delta: string
  index: number
  visible: string
}

export function decodeUtf8Steps(chunks: readonly Uint8Array[]): readonly Utf8DecodeStep[] {
  const decoder = new TextDecoder()
  let visible = ''
  return chunks.map((chunk, index) => {
    const streaming = index < chunks.length - 1
    const delta = decoder.decode(chunk, { stream: streaming })
    visible += delta
    return { delta, index, visible }
  })
}

export function decodeUtf8Chunks(chunks: readonly Uint8Array[]): string {
  return decodeUtf8Steps(chunks).at(-1)?.visible ?? ''
}
