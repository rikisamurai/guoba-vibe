import type { LessonPresetId } from '@stream-render/contract'

import type { LabConfig, LabPreset } from './types'

const QUICK_START_MARKDOWN = `# Streaming Markdown

同一份输入同时交给 **M0** 和 **M4**。

\`\`\`ts
function answer(raw: string) {
  return render(raw)
}
\`\`\`

| mode | strategy |
| --- | --- |
| M0 | every delta |
| M4 | stable blocks |
`

const M1_MARKDOWN = `# M1 frame batching

同一帧内到达的 **delta A / B / C** 应只触发一次 preview commit。
`

const BASE: Omit<LabConfig, 'presetId'> = {
  input: QUICK_START_MARKDOWN,
  baseline: 'M0',
  challenger: 'M4',
  transport: 'readable-stream',
  sliceMode: 'random',
  chunkMin: 12,
  chunkMax: 32,
  delayMin: 2,
  delayMax: 8,
  burstiness: 60,
  seed: 42,
  commitCadenceMs: 16,
  reveal: 'direct',
  trace: 'full',
}

export const LAB_PRESETS: readonly LabPreset[] = [
  {
    id: 'quick-start-burst',
    label: 'Quick Start · mixed Markdown',
    summary: '同一份真实 SSE wire 同时驱动两条渲染 pipeline。',
    question: 'M4 能否在保持终态一致的同时减少重复提交？',
    config: {
      ...BASE,
      presetId: 'quick-start-burst',
      chunkMin: 2_048,
      chunkMax: 4_096,
      delayMin: 0,
      delayMax: 0,
      burstiness: 100,
    },
  },
  {
    id: 'sse-edge-cases',
    label: 'SSE · byte boundaries',
    summary: 'BOM、CR/LF/CRLF、comment、id、retry 与多行 data。',
    question: '任意 byte split 后，provider event 是否仍保持一致？',
    config: {
      ...BASE,
      presetId: 'sse-edge-cases',
      challenger: 'M1',
      chunkMin: 8,
      chunkMax: 20,
      delayMin: 2,
      delayMax: 7,
      burstiness: 55,
      seed: 7,
    },
  },
  {
    id: 'm1-frame-batching',
    label: 'M1 · frame batching',
    summary: '高频小 delta 暴露 M0 每次提交与 M1 帧合并的差异。',
    question: '同一帧收到多个 delta 时，M1 是否只提交一次？',
    config: {
      ...BASE,
      presetId: 'm1-frame-batching',
      input: M1_MARKDOWN,
      challenger: 'M1',
      transport: 'async-iterable',
      chunkMin: 16,
      chunkMax: 42,
      delayMin: 0,
      delayMax: 4,
      burstiness: 82,
      seed: 19,
    },
  },
]

export function labPreset(id: LessonPresetId): LabPreset {
  return LAB_PRESETS.find((preset) => preset.id === id) ?? LAB_PRESETS[0]
}

export function presetConfig(id: LessonPresetId): LabConfig {
  return { ...labPreset(id).config }
}
