/**
 * 回放样本：刻意塞满流式渲染的高危结构——
 * 强调/行内代码/链接（前视歧义）、表格（跨行语义）、长代码围栏、
 * mermaid 围栏、CJK + emoji（多字节/grapheme 边界）。
 */
export const FIXTURE_MARKDOWN = `# 流式渲染压力样本

这是一段**着重强调**的文字，混着*斜体*、\`inline code\` 和一个
[带标题的链接](https://example.com "示例")，再加中日韩字符与 emoji：
你好世界 🌍👨‍👩‍👧‍👦，こんにちは，안녕하세요。

## 列表与引用

1. 有序列表第一项
2. 第二项带 **加粗** 和 \`code\`
   - 嵌套的无序项
   - 另一个嵌套项

> 引用块里也有 *强调* 与 [链接](https://example.com)。

## 表格

| 方案 | 增量层次 | 典型代表 |
| ---- | -------- | -------- |
| 全文重解析 | 无 | markdown-it |
| 稳定前缀 | 块级 | Streamdown |
| 增量 AST | token 级 | Lezer |

## 代码围栏

\`\`\`typescript
export function fib(n: number): number {
  if (n <= 1) return n
  let a = 0
  let b = 1
  for (let i = 2; i <= n; i++) {
    const next = a + b
    a = b
    b = next
  }
  return b
}
\`\`\`

## Mermaid

\`\`\`mermaid
flowchart LR
  A[SSE 字节流] --> B[事件解析]
  B --> C[增量合并]
  C --> D[Markdown 渲染]
\`\`\`

尾段：未闭合结构最容易出问题的地方在**结尾
`
