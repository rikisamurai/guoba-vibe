/** 内容切分：把 markdown 原文切成模型「本应」逐段吐出的 delta 序列 */

/** 均匀切分——大多数 demo 的做法，也是文档点名「不可信」的那种 */
export function splitUniform(text: string, size = 3): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}

const MARKERS = new Set(['*', '`', '|', '[', ']', '(', '#', '~', '\n'])

/**
 * 恶意切分：在每个语法标记字符之后立刻切一刀，
 * 让 \`**\` 被劈成两半、表格竖线单独成 delta、围栏反引号逐个到达——
 * 这些正是「后续字符会改变前文含义」的前视歧义高发点。
 */
export function splitAdversarial(text: string, maxRun = 24): string[] {
  const out: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (MARKERS.has(text[i]) || i - start >= maxRun) {
      out.push(text.slice(start, i + 1))
      start = i + 1
    }
  }
  if (start < text.length) out.push(text.slice(start))
  return out
}
