export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const value: unknown = await request.json().catch(() => null)
  return isRecord(value) ? value : null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback
}
