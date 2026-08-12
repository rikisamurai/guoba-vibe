export interface CourseLesson {
  number: number
  title: string
  shortTitle: string
  href?: string
  checkpoints: readonly string[]
}

export interface CoursePart {
  label: string
  title: string
  lessons: readonly CourseLesson[]
}

export const orientationLesson = lesson(0, 'Quick Start', '/learn/00-quick-start', [
  '找到课程与实验台入口',
  '说清 byte 到 React 的路径',
  '跑通第一条本地命令',
])

export const courseParts: readonly CoursePart[] = [
  {
    label: 'PART 1',
    title: '建立心智模型',
    lessons: [
      lesson(1, '非流式 Mini Chat', '/learn/01-non-streaming-chat', [
        '完成最小请求与渲染',
        '分离 source 与 view',
        '为 streaming 留下 seam',
      ]),
      lesson(2, 'Replay 与 Clock', '/learn/02-string-replay-clock', [
        '重放同一条 trace',
        '控制 arrival clock',
        '写出确定性测试',
      ]),
      lesson(3, 'M0 · Raw / Visible', '/learn/03-m0-raw-visible', [
        '保存 canonical raw',
        '发布 visible snapshot',
        '记录全文重算基线',
      ]),
    ],
  },
  {
    label: 'PART 2',
    title: '穿过网络管线',
    lessons: [
      lesson(4, '增量 UTF-8', '/learn/04-utf8', [
        '跨 chunk 保留 decoder',
        '通过 every-byte test',
        '正确 flush EOF',
      ]),
      lesson(5, 'WHATWG SSE', '/learn/05-sse', ['识别三种换行', '合并多行 data', '区分空行与 EOF']),
      lesson(6, 'Chat Completions', '/learn/06-chat-completions', [
        '映射 content delta',
        '识别 finish reason',
        '证明 terminal outcome',
      ]),
      lesson(7, 'Responses', undefined, [
        '验证 sequence number',
        '区分 completed / incomplete',
        '保留 provider origin',
      ]),
      lesson(8, 'Anthropic Messages', undefined, [
        '定位 content block',
        '累积 partial JSON',
        '映射 message_stop',
      ]),
    ],
  },
  {
    label: 'PART 3',
    title: '构建渲染管线',
    lessons: [
      lesson(9, 'Run lifecycle', undefined, [
        '分离 phase 与 outcome',
        '证明唯一 settled',
        '区分 incomplete / truncated',
      ]),
      lesson(10, 'M1 · Frame batching · 黄金样板', '/learn/10-m1-frame-batching', [
        '每帧至多一次 commit',
        '安全 drain pending delta',
        'cancel 后无 late update',
      ]),
      lesson(11, 'Preview repair', undefined, [
        '修补未闭合语法',
        '标记 synthetic range',
        '终态回到 raw truth',
      ]),
      lesson(12, 'M2 · Block identity', undefined, [
        '保持稳定 block id',
        '复用未变化 IR',
        '验证 React memo',
      ]),
      lesson(13, 'M3 · Suffix reparse', undefined, [
        '找到 quiescent checkpoint',
        '拼接 stable prefix',
        '记录 fallback 原因',
      ]),
      lesson(14, 'M4 · Heavy nodes', undefined, [
        '增量高亮代码',
        'debounce 重型节点',
        '拒绝 stale result',
      ]),
    ],
  },
  {
    label: 'PART 4',
    title: '产品化与证明',
    lessons: [
      lesson(15, 'Chat 产品行为', undefined, [
        '保持滚动与选择',
        '分离 reasoning',
        '批量播报 aria-live',
      ]),
      lesson(16, '安全与终态', undefined, [
        'sanitize render IR',
        '处理 truncated',
        '证明唯一 settled',
      ]),
      lesson(17, 'Profiler 与 Bench', undefined, [
        '设计可信 A/B',
        '读懂 parse 与 commit',
        '验证渐近工作量',
      ]),
      lesson(18, 'Capstone 与面试', undefined, [
        '交付完整 Mini Chat',
        '复盘三次工程事故',
        '讲清架构 trade-off',
      ]),
    ],
  },
]

function lesson(
  number: number,
  title: string,
  href: string | undefined,
  checkpoints: readonly string[],
): CourseLesson {
  return { number, title, shortTitle: title.split(' · ')[0], href, checkpoints }
}

export function findLesson(pathname: string): CourseLesson | undefined {
  const cleanPath = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/'
  return [orientationLesson, ...courseParts.flatMap((part) => part.lessons)].find(
    (item) => item.href === cleanPath,
  )
}
