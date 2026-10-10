import { defineConfig } from '@rspress/core'

export default defineConfig({
  root: 'docs',
  title: 'How Streaming Render Works',
  description: '流式 Markdown 渲染：从 SSE 协议到重型节点调度的完整实现教程',
  themeConfig: {
    nav: [{ text: '教程', link: '/guide/intro' }],
    sidebar: {
      '/guide/': [
        { text: '1 · 开篇：流式渲染为什么难', link: '/guide/intro' },
        { text: '2 · 传输层：手写 SSE 解析', link: '/guide/transport' },
        { text: '3 · P0：最小可用基线', link: '/guide/p0' },
        { text: '4 · 回放模拟器', link: '/guide/replay' },
        { text: '5 · P1：调度器与稳定前缀', link: '/guide/p1' },
        { text: '6 · P2：Shiki 与 Mermaid', link: '/guide/p2' },
        { text: '7 · 收尾：安全与评测', link: '/guide/wrap' },
      ],
    },
  },
})
