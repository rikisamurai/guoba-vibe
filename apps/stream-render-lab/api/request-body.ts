export const MAX_REQUEST_BODY_BYTES = 128 * 1024

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'invalid_json' | 'too_large' }

export function declaredBodyIsTooLarge(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return false
  return BigInt(normalized) > BigInt(MAX_REQUEST_BODY_BYTES)
}

export async function readBoundedJson(request: Request): Promise<JsonBodyResult> {
  if (declaredBodyIsTooLarge(request.headers.get('content-length'))) {
    return { ok: false, reason: 'too_large' }
  }
  if (request.body === null) return { ok: false, reason: 'invalid_json' }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- byte cap must be enforced while consuming
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_REQUEST_BODY_BYTES) {
      // oxlint-disable-next-line no-await-in-loop -- stop the request stream immediately
      await reader.cancel('request_too_large').catch(() => undefined)
      return { ok: false, reason: 'too_large' }
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
}
