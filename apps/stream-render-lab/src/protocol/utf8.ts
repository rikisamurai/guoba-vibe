export interface Utf8ChunkObservation {
  index: number
  byteLength: number
  text: string
}

export interface Utf8DecodeHooks {
  onChunk?(observation: Utf8ChunkObservation): void
  onFlush?(text: string): void
}

export async function* decodeUtf8(
  chunks: AsyncIterable<Uint8Array>,
  hooks: Utf8DecodeHooks = {},
): AsyncGenerator<string> {
  const decoder = new TextDecoder('utf-8')
  let index = 0

  for await (const chunk of chunks) {
    const text = decoder.decode(chunk, { stream: true })
    hooks.onChunk?.({ index, byteLength: chunk.byteLength, text })
    index += 1
    if (text !== '') yield text
  }

  const tail = decoder.decode()
  hooks.onFlush?.(tail)
  if (tail !== '') yield tail
}
