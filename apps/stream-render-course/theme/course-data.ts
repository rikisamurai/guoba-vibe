export interface CourseLesson {
  number: number
  title: string
  shortTitle: string
  href: string
  marker: string
}
export interface CoursePart {
  label: string
  title: string
  lessons: readonly CourseLesson[]
}
export const orientationLesson = lesson(0, '开始：同一个 Mini Chat', '00-quick-start', '00')
export const courseParts: readonly CoursePart[] = [
  {
    label: 'A',
    title: '读懂真实网络',
    lessons: [
      lesson(7, 'HTTP：第一段数据从哪来', 'a1-http', 'A1'),
      lesson(4, '字节：中文被切开了', 'a2-utf8', 'A2'),
      lesson(5, 'SSE：半行不是一个事件', 'a3-sse', 'A3'),
      lesson(6, '正文：事件不是 token', 'a4-chat-completions', 'A4'),
    ],
  },
  {
    label: 'B',
    title: '让同一个聊天可靠',
    lessons: [
      lesson(8, '停止、截断与重试', 'b1-lifecycle', 'B1'),
      lesson(9, '从正文到 Markdown', 'b2-markdown', 'B2'),
      lesson(15, '接收时也能正常阅读', 'b3-chat-behavior', 'B3'),
      lesson(16, '安全显示与协议终态', 'b4-safety', 'B4'),
      lesson(18, '验收我的 Mini Chat', 'b5-capstone', 'B5'),
    ],
  },
  {
    label: 'C',
    title: '测量后再优化',
    lessons: [
      lesson(10, '合并更新与尾帧', 'c1-frame-batching', 'C1'),
      lesson(11, '半截 Markdown 的预览', 'c2-preview-repair', 'C2'),
      lesson(12, '复用语义不变的块', 'c3-block-identity', 'C3'),
      lesson(13, '只重算变化的尾部', 'c4-suffix-reparse', 'C4'),
      lesson(14, '延后昂贵的渲染', 'c5-heavy-nodes', 'C5'),
      lesson(17, '提交一份性能结论', 'c6-measurement', 'C6'),
    ],
  },
  {
    label: '补充',
    title: '最小模型（按需阅读）',
    lessons: [
      lesson(1, '完整返回的最小模型', 's1-non-streaming-chat', 'S1'),
      lesson(2, '可重复的时间与回放', 's2-string-replay-clock', 'S2'),
      lesson(3, '已收到与已显示', 's3-m0-raw-visible', 'S3'),
    ],
  },
]
function lesson(number: number, title: string, path: string, marker: string): CourseLesson {
  return { number, title, shortTitle: title, href: `/learn/${path}`, marker }
}
export function findLesson(pathname: string): CourseLesson | undefined {
  const path = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/'
  return [orientationLesson, ...courseParts.flatMap((part) => part.lessons)].find(
    (item) => item.href === path,
  )
}
