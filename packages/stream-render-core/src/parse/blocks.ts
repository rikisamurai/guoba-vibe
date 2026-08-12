/**
 * 块级切分：把 markdown 前缀切成顶层块序列。
 *
 * 这不是完整 parser——它只需要对「块边界」做出与 markdown-it
 * 一致的判断，让稳定前缀可以按块冻结。已知取舍（教学版）：
 * setext 标题（下一行 === 会改写上一段）与跨块链接定义不处理，
 * 它们正是文档所说「跨块语义迫使多块失效」的例子。
 */
export interface MdBlock {
  text: string
  /** 围栏类块是否已看到闭合围栏 */
  closed: boolean
  /** 是否是代码围栏块（P2 的重型节点入口） */
  fence: boolean
  /** 围栏语言（fence 为 true 时有意义） */
  lang: string
}

const FENCE_RE = /^(`{3,}|~{3,})(.*)$/

export function splitBlocks(text: string): MdBlock[] {
  const lines = text.split('\n')
  const blocks: MdBlock[] = []
  let current: string[] = []
  let fenceMark: string | null = null
  let fenceLang = ''

  const push = (closed: boolean, fence: boolean) => {
    if (current.length === 0) return
    blocks.push({ text: current.join('\n'), closed, fence, lang: fenceLang })
    current = []
    fenceLang = ''
  }

  for (const line of lines) {
    if (fenceMark !== null) {
      current.push(line)
      if (line.trimEnd() === fenceMark) {
        push(true, true)
        fenceMark = null
      }
      continue
    }

    const fence = FENCE_RE.exec(line)
    if (fence) {
      push(true, false)
      fenceMark = fence[1]
      fenceLang = fence[2].trim()
      current.push(line)
      continue
    }

    if (line.trim() === '') {
      push(true, false)
    } else {
      current.push(line)
    }
  }

  // 文末残余：普通块视为未闭合的尾块；未闭合围栏同理
  if (fenceMark !== null) push(false, true)
  else push(false, false)

  return blocks
}
