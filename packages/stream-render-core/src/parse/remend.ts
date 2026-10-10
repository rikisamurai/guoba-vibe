/**
 * 尾部语法修补（remend 式乐观补全）：给 dirty 尾块的未闭合结构
 * 补上「假闭合」，让渲染中间态好看。铁律：补全结果只进渲染管线，
 * 永不写回 rawText——复制/持久化读到的必须是模型原文。
 */
export function remendTail(text: string): string {
  let out = text

  // 未闭合的行内代码：反引号个数为奇则补一个（先于强调处理，
  // 因为反引号内的 * 不算强调标记——粗略计数版的顺序补偿）
  const backticks = (out.match(/(?<!`)`(?!`)/g) ?? []).length
  if (backticks % 2 === 1) out += '`'

  // 未闭合的粗体 **
  const bold = (out.match(/\*\*/g) ?? []).length
  if (bold % 2 === 1) out += '**'

  // 未闭合的斜体 *（排除 ** 后剩余的单星号）
  const striped = out.replace(/\*\*/g, '')
  const italic = (striped.match(/\*/g) ?? []).length
  if (italic % 2 === 1) out += '*'

  return out
}

/** 未闭合代码围栏的假闭合：与块级切分配合，在整块层面补 */
export function remendFence(text: string): string {
  const mark = /^(`{3,}|~{3,})/.exec(text)?.[1] ?? '```'
  return `${text}\n${mark}`
}
