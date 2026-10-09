export interface MeasuredBlock {
  height: number
  id: string
}

export interface WindowPlan {
  bottomSpacer: number
  endIndex: number
  ids: readonly string[]
  startIndex: number
  topSpacer: number
  totalHeight: number
}

export interface WindowRequest {
  blocks: readonly MeasuredBlock[]
  overscan: number
  pinnedIds?: readonly string[]
  scrollTop: number
  viewportHeight: number
}

export type LongOutputMode = 'none' | 'content-visibility' | 'windowed'

function offsetsOf(blocks: readonly MeasuredBlock[]): number[] {
  const offsets = [0]
  blocks.forEach((block) => {
    offsets.push(offsets.at(-1)! + Math.max(1, block.height))
  })
  return offsets
}

function visibleBounds(offsets: readonly number[], start: number, end: number): [number, number] {
  const blockCount = offsets.length - 1
  let first = 0
  while (first < blockCount && offsets[first + 1] < start) first += 1
  let last = first
  while (last < blockCount && offsets[last] <= end) last += 1
  return [first, Math.max(first, last)]
}

export function planBlockWindow(request: WindowRequest): WindowPlan {
  const offsets = offsetsOf(request.blocks)
  const totalHeight = offsets.at(-1) ?? 0
  const viewportStart = Math.max(0, request.scrollTop - request.overscan)
  const viewportEnd = request.scrollTop + request.viewportHeight + request.overscan
  let [startIndex, endIndex] = visibleBounds(offsets, viewportStart, viewportEnd)
  const pinned = new Set(request.pinnedIds ?? [])
  request.blocks.forEach((block, index) => {
    if (!pinned.has(block.id)) return
    startIndex = Math.min(startIndex, index)
    endIndex = Math.max(endIndex, index + 1)
  })
  return {
    bottomSpacer: Math.max(0, totalHeight - (offsets[endIndex] ?? totalHeight)),
    endIndex,
    ids: request.blocks.slice(startIndex, endIndex).map((block) => block.id),
    startIndex,
    topSpacer: offsets[startIndex] ?? 0,
    totalHeight,
  }
}

export function chooseLongOutputMode(input: {
  blockCount: number
  contentVisibilitySupported: boolean
  measurementsReady: boolean
  selectionActive: boolean
}): LongOutputMode {
  if (input.blockCount < 200) return 'none'
  if (input.selectionActive || !input.measurementsReady) {
    return input.contentVisibilitySupported ? 'content-visibility' : 'none'
  }
  if (input.blockCount >= 800) return 'windowed'
  return input.contentVisibilitySupported ? 'content-visibility' : 'none'
}
