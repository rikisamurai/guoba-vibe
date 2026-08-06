import process from 'node:process'

import { defineConfig } from '@rspress/core'

const port = Number(process.env.STREAM_RENDER_COURSE_PORT ?? 5173)
const labOrigin = process.env.PUBLIC_LAB_ORIGIN ?? 'http://localhost:5174'

export default defineConfig({
  root: 'docs',
  title: 'Streaming Render Course',
  description: '从网络字节到 React commit，亲手实现 AI Chat 的流式渲染。',
  icon: '/mark.svg',
  lang: 'zh',
  llms: true,
  ssg: true,
  builderConfig: {
    source: {
      define: {
        'import.meta.env.PUBLIC_LAB_ORIGIN': JSON.stringify(labOrigin),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
    },
  },
})
