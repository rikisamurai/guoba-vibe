import type { ReadRecord } from '../practice/types'

function cutsCharacter(bytes: number[]): boolean {
  if (bytes.length && bytes[0] >= 0x80 && bytes[0] < 0xc0) return true
  for (let back = 1; back <= Math.min(3, bytes.length); back++) {
    const byte = bytes[bytes.length - back]
    if (byte < 0x80) return false
    if (byte >= 0xc0) return back < (byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : 2)
  }
  return false
}

export function readTag(record: ReadRecord): string | null {
  if (record.eof || !record.bytes.length) return null
  if (cutsCharacter(record.bytes)) return '字符被切开'
  if (!record.events.length) return '未派发事件'
  return record.text.length ? null : '无正文'
}
