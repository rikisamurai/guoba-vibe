export const PROPERTY_RUNS = 40

export const PARTITION_WIDTHS = {
  minLength: 0,
  maxLength: 48,
} as const

export function partitionBytes(bytes: Uint8Array, widths: readonly number[]): Uint8Array[] {
  const chunks: Uint8Array[] = []
  let offset = 0

  for (const width of widths) {
    if (offset >= bytes.length) break
    const end = Math.min(offset + width, bytes.length)
    chunks.push(bytes.slice(offset, end))
    offset = end
  }
  if (offset < bytes.length) chunks.push(bytes.slice(offset))
  return chunks
}

export function partitionText(text: string, widths: readonly number[]): string[] {
  const chunks: string[] = []
  let offset = 0

  for (const width of widths) {
    if (offset >= text.length) break
    const end = Math.min(offset + width, text.length)
    chunks.push(text.slice(offset, end))
    offset = end
  }
  if (offset < text.length) chunks.push(text.slice(offset))
  return chunks
}

export async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = []
  for await (const value of source) values.push(value)
  return values
}

export async function* fromArray<T>(items: readonly T[]): AsyncGenerator<T> {
  yield* items
}
