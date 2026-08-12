export const LESSON_DEMOS = {
  response: {
    defaultPreset: 'complete-response',
    label: '完整响应基线',
    presets: ['complete-response'],
  },
  replay: {
    defaultPreset: 'string-replay',
    label: '可控字符串流',
    presets: ['string-replay'],
  },
  m0: {
    defaultPreset: 'm0-every-delta',
    label: 'M0 raw / visible',
    presets: ['m0-every-delta'],
  },
  utf8: {
    defaultPreset: 'utf8-byte-boundary',
    label: 'UTF-8 byte boundary',
    presets: ['utf8-byte-boundary'],
  },
  'quick-start': {
    defaultPreset: 'quick-start-burst',
    label: 'M0 与 M4 对照',
    presets: ['quick-start-burst'],
  },
  sse: {
    defaultPreset: 'sse-edge-cases',
    label: 'WHATWG SSE 边界实验',
    presets: ['sse-edge-cases'],
  },
  'chat-adapter': {
    defaultPreset: 'chat-completions-wire',
    label: 'Chat Completions adapter',
    presets: ['chat-completions-wire'],
  },
  m1: {
    defaultPreset: 'm1-frame-batching',
    label: 'M1 帧批处理实验',
    presets: ['m1-frame-batching'],
  },
} as const

export const DEMO_MANIFEST = LESSON_DEMOS

export type LessonDemoId = keyof typeof LESSON_DEMOS

type DemoDefinition = (typeof LESSON_DEMOS)[LessonDemoId]

export type LessonPresetId = DemoDefinition['presets'][number]

export interface LessonDemoDefinition {
  defaultPreset: LessonPresetId
  demoId: LessonDemoId
  label: string
  presets: readonly LessonPresetId[]
}

const DEMO_IDS = [
  'response',
  'replay',
  'm0',
  'utf8',
  'quick-start',
  'sse',
  'chat-adapter',
  'm1',
] as const satisfies readonly LessonDemoId[]

export function isLessonDemoId(value: unknown): value is LessonDemoId {
  return typeof value === 'string' && DEMO_IDS.some((demoId) => demoId === value)
}

export function isDemoPresetPair(
  demoId: LessonDemoId,
  presetId: unknown,
): presetId is LessonPresetId {
  if (typeof presetId !== 'string') return false
  const presets: readonly string[] = LESSON_DEMOS[demoId].presets
  return presets.includes(presetId)
}

export function listLessonDemos(): readonly LessonDemoDefinition[] {
  return DEMO_IDS.map((demoId) => ({
    defaultPreset: LESSON_DEMOS[demoId].defaultPreset,
    demoId,
    label: LESSON_DEMOS[demoId].label,
    presets: LESSON_DEMOS[demoId].presets,
  }))
}
