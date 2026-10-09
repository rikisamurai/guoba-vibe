export interface CourseLesson {
  number: number
  title: string
  shortTitle: string
  href: string
}
export interface CoursePart {
  label: string
  title: string
  lessons: readonly CourseLesson[]
}
export const orientationLesson = lesson(0, '先看见流式的区别', '00-quick-start')
export const courseParts: readonly CoursePart[] = [
  {
    label: '阶段 1',
    title: '先做出来',
    lessons: [
      lesson(1, '做出一次完整回答', '01-non-streaming-chat'),
      lesson(2, '让文字分段出现', '02-string-replay-clock'),
      lesson(3, '收到与显示的文字', '03-m0-raw-visible'),
    ],
  },
  {
    label: '阶段 2',
    title: '理解网络',
    lessons: [
      lesson(4, '中文为什么乱码', '04-utf8'),
      lesson(5, '拼出完整 SSE 事件', '05-sse'),
      lesson(6, '取出回答正文', '06-chat-completions'),
      lesson(7, '真正发一次 HTTP 请求', '07-http'),
    ],
  },
  {
    label: '阶段 3',
    title: '可靠与流畅',
    lessons: [
      lesson(8, '停止、错误与重试', '08-lifecycle'),
      lesson(9, '显示 Markdown', '09-markdown'),
      lesson(10, '合并更新', '10-m1-frame-batching'),
    ],
  },
  {
    label: '阶段 4',
    title: '渲染进阶（可稍后学习）',
    lessons: [
      lesson(11, '半截 Markdown 的预览', '11-preview-repair'),
      lesson(12, '复用不变的段落', '12-block-identity'),
      lesson(13, '只重算变化的尾部', '13-suffix-reparse'),
      lesson(14, '高亮、公式与图表', '14-heavy-nodes'),
    ],
  },
  {
    label: '阶段 5',
    title: '完成项目',
    lessons: [
      lesson(15, '聊天交互与阅读', '15-chat-behavior'),
      lesson(16, '安全与终态', '16-safety'),
      lesson(17, '验证优化效果', '17-measurement'),
      lesson(18, '组装完整 Mini Chat', '18-capstone'),
    ],
  },
]
function lesson(number: number, title: string, path: string): CourseLesson {
  return { number, title, shortTitle: title, href: `/learn/${path}` }
}
export function findLesson(pathname: string): CourseLesson | undefined {
  const path = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/'
  return [orientationLesson, ...courseParts.flatMap((part) => part.lessons)].find(
    (item) => item.href === path,
  )
}
