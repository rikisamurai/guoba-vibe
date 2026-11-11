export interface Variability {
  cvPercent: number | null
  rmePercent: number | null
}

export function variability(values: readonly number[]): Variability {
  if (values.length < 2) return { cvPercent: null, rmePercent: null }
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  if (mean === 0) return { cvPercent: 0, rmePercent: 0 }
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1)
  const deviation = Math.sqrt(variance)
  return {
    cvPercent: (deviation / mean) * 100,
    rmePercent: ((1.96 * deviation) / Math.sqrt(values.length) / mean) * 100,
  }
}

export function browserHeapBytes(): number | null {
  const memory: unknown = Reflect.get(performance, 'memory')
  if (typeof memory !== 'object' || memory === null) return null
  const used: unknown = Reflect.get(memory, 'usedJSHeapSize')
  return typeof used === 'number' ? used : null
}
