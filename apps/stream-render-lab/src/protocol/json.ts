export type JsonObject = Record<string, unknown>

export function parseJsonObject(text: string): JsonObject {
  const value: unknown = JSON.parse(text)
  if (!isJsonObject(value)) throw new TypeError('Expected a JSON object')
  return value
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function objectField(object: JsonObject, key: string): JsonObject | undefined {
  const value = object[key]
  return isJsonObject(value) ? value : undefined
}

export function stringField(object: JsonObject, key: string): string | undefined {
  const value = object[key]
  return typeof value === 'string' ? value : undefined
}

export function numberField(object: JsonObject, key: string): number | undefined {
  const value = object[key]
  return typeof value === 'number' ? value : undefined
}
