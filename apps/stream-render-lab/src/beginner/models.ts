export const INTRO_PARTS = ['流式', '让你', '更早', '看到', '已经生成', '的内容。']

export function compareDelivery(count: number, interval = 400) {
  const received = INTRO_PARTS.slice(0, count).join('')
  const done = count === INTRO_PARTS.length
  return {
    received,
    complete: done ? received : '',
    elapsed: count * interval,
    firstStream: count > 0 ? interval : null,
    firstComplete: done ? count * interval : null,
    done,
  }
}

export function decodeSplit(text: string, split: number) {
  const bytes = new TextEncoder().encode(text)
  const first = bytes.slice(0, split)
  const second = bytes.slice(split)
  const decoder = new TextDecoder()
  const head = decoder.decode(first, { stream: true })
  const tail = decoder.decode(second, { stream: true }) + decoder.decode()
  return {
    first: Array.from(first),
    second: Array.from(second),
    wrong: new TextDecoder().decode(first) + new TextDecoder().decode(second),
    correct: head + tail,
    head,
  }
}

export function compareBatch(parts: readonly string[], batchSize: number, interval = 20) {
  const snapshots: string[] = []
  let text = ''
  for (const [index, part] of parts.entries()) {
    text += part
    if ((index + 1) % batchSize === 0 || index === parts.length - 1) snapshots.push(text)
  }
  return { snapshots, text, firstVisible: Math.min(parts.length, batchSize) * interval }
}
