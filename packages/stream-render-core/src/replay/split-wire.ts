/**
 * 线级切割：把完整的 SSE 传输字节流按不同网络画像切成带时序的 chunk。
 * 切割发生在字节层——完全无视事件边界和 UTF-8 字符边界，
 * 这正是真实网络与代理对流做的事。
 */
export interface WireChunk {
  bytes: Uint8Array
  /** 该 chunk 相对上一个 chunk 的到达间隔 */
  delayMs: number
}

/** 确定性 PRNG：同一 seed 产出同一时间线，保证回放可复现 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sliceUniform(bytes: Uint8Array, size = 64, delayMs = 30): WireChunk[] {
  const out: WireChunk[] = []
  for (let i = 0; i < bytes.length; i += size) {
    out.push({ bytes: bytes.slice(i, i + size), delayMs })
  }
  return out
}

export interface JitterOptions {
  seed?: number
  minSize?: number
  maxSize?: number
  minDelay?: number
  maxDelay?: number
}

/** 随机抖动：chunk 大小与间隔都不可预测，偶尔出现 1 字节的碎片 */
export function sliceJitter(bytes: Uint8Array, options: JitterOptions = {}): WireChunk[] {
  const { seed = 1, minSize = 1, maxSize = 160, minDelay = 5, maxDelay = 220 } = options
  const rng = mulberry32(seed)
  const out: WireChunk[] = []
  let i = 0
  while (i < bytes.length) {
    const size = minSize + Math.floor(rng() * (maxSize - minSize + 1))
    out.push({
      bytes: bytes.slice(i, i + size),
      delayMs: minDelay + Math.floor(rng() * (maxDelay - minDelay + 1)),
    })
    i += size
  }
  return out
}

export interface BurstOptions {
  chunkSize?: number
  burstLen?: number
  pauseMs?: number
  intraMs?: number
}

/** 代理缓冲画像：长时间静默，然后一大串 chunk 挤在一起到达 */
export function sliceBurst(bytes: Uint8Array, options: BurstOptions = {}): WireChunk[] {
  const { chunkSize = 24, burstLen = 40, pauseMs = 900, intraMs = 2 } = options
  const out: WireChunk[] = []
  let inBurst = 0
  for (let i = 0; i < bytes.length; i += chunkSize) {
    out.push({
      bytes: bytes.slice(i, i + chunkSize),
      delayMs: inBurst === 0 ? pauseMs : intraMs,
    })
    inBurst = (inBurst + 1) % burstLen
  }
  return out
}
