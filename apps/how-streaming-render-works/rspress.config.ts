import { defineConfig } from '@rspress/core'

export default defineConfig({
  root: 'docs',
  title: 'How Streaming Render Works',
  description: '流式 Markdown 渲染：从 SSE 协议到重型节点调度的完整实现教程',
  themeConfig: {
    nav: [{ text: '教程', link: '/guide/intro' }],
    sidebar: {
      '/guide/': [{ text: '开篇：流式渲染为什么难', link: '/guide/intro' }],
    },
  },
})
