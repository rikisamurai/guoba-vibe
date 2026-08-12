/**
 * Deterministic chunk planning for the simulator. A plan slices the corpus
 * bytes (not characters — cuts may land inside UTF-8 sequences on purpose)
 * and assigns each slice an arrival delay. Same text+profile+seed → same plan.
 */
export type ProfileId = 'ideal' | 'jitter' | 'burst' | 'boundary'

export interface ChunkPlan {
  bytes: Uint8Array
  delayMs: number
}

export const PROFILE_IDS: ProfileId[] = ['ideal', 'jitter', 'burst', 'boundary']

/** mulberry32 — tiny deterministic PRNG, returns floats in [0, 1). */
function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** Byte offsets one byte INSIDE syntax markers and multi-byte characters. */
function boundaryCutPoints(bytes: Uint8Array): number[] {
  const cuts: number[] = []
  for (let i = 0; i < bytes.length - 1; i++) {
    const byte = bytes[i]
    const next = bytes[i + 1]
    // inside a ** or `` pair, or right after a table pipe
    if ((byte === 0x2a && next === 0x2a) || (byte === 0x60 && next === 0x60)) cuts.push(i + 1)
    // one byte into a UTF-8 multi-byte sequence (lead byte >= 0xc0)
    if (byte >= 0xc0) cuts.push(i + 1)
  }
  return cuts
}

function sliceByCuts(bytes: Uint8Array, cuts: number[], delayOf: () => number): ChunkPlan[] {
  const points = [...new Set(cuts.filter((cut) => cut > 0 && cut < bytes.length))].toSorted(
    (a, b) => a - b,
  )
  const plan: ChunkPlan[] = []
  let start = 0
  for (const point of [...points, bytes.length]) {
    if (point <= start) continue
    plan.push({ bytes: bytes.subarray(start, point), delayMs: delayOf() })
    start = point
  }
  return plan
}

export function planChunks(text: string, profile: ProfileId, seed: number): ChunkPlan[] {
  const bytes = new TextEncoder().encode(text)
  const rng = createRng(seed)

  if (profile === 'ideal') {
    const cuts: number[] = []
    for (let at = intBetween(rng, 6, 14); at < bytes.length; at += intBetween(rng, 6, 14)) {
      cuts.push(at)
    }
    return sliceByCuts(bytes, cuts, () => 30)
  }

  if (profile === 'jitter') {
    const cuts: number[] = []
    for (let at = intBetween(rng, 1, 30); at < bytes.length; at += intBetween(rng, 1, 30)) {
      cuts.push(at)
    }
    return sliceByCuts(bytes, cuts, () => intBetween(rng, 10, 300))
  }

  if (profile === 'burst') {
    const cuts: number[] = []
    for (let at = intBetween(rng, 800, 2500); at < bytes.length; at += intBetween(rng, 800, 2500)) {
      cuts.push(at)
    }
    return sliceByCuts(bytes, cuts, () => intBetween(rng, 500, 2000))
  }

  // boundary: medium pacing, but force cuts inside markers and multi-byte chars
  const cuts = boundaryCutPoints(bytes)
  for (let at = intBetween(rng, 10, 24); at < bytes.length; at += intBetween(rng, 10, 24)) {
    cuts.push(at)
  }
  return sliceByCuts(bytes, cuts, () => intBetween(rng, 20, 80))
}
