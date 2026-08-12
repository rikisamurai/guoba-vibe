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

const FOUNDATION_MARKDOWN = `# Mini Chat

你好，🙂！这是同一个回答从网络到屏幕的旅程。
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
    id: 'complete-response',
    label: '01 · 完整响应',
    summary: '先建立正确但没有流式反馈的最小基线。',
    question: '为什么最终文本正确，等待体验仍然很差？',
    config: {
      ...BASE,
      presetId: 'complete-response',
      input: FOUNDATION_MARKDOWN,
      challenger: 'M1',
      chunkMin: 2_048,
      chunkMax: 4_096,
      delayMin: 600,
      delayMax: 600,
      burstiness: 0,
    },
  },
  {
    id: 'string-replay',
    label: '02 · 可控字符串流',
    summary: '暂停、单步和重放同一组字符串 delta。',
    question: '一次 arrival 是否必然对应一次 display？',
    config: {
      ...BASE,
      presetId: 'string-replay',
      input: FOUNDATION_MARKDOWN,
      challenger: 'M1',
      chunkMin: 5,
      chunkMax: 9,
      delayMin: 10,
      delayMax: 22,
      burstiness: 25,
      seed: 2,
    },
  },
  {
    id: 'm0-every-delta',
    label: '03 · M0 raw / visible',
    summary: '让每个 delta 都触发全文 parse 与 visible commit。',
    question: 'raw truth 与屏幕版本为什么需要分别计数？',
    config: {
      ...BASE,
      presetId: 'm0-every-delta',
      input: FOUNDATION_MARKDOWN,
      challenger: 'M1',
      chunkMin: 1,
      chunkMax: 4,
      delayMin: 0,
      delayMax: 2,
      burstiness: 92,
      seed: 3,
    },
  },
  {
    id: 'utf8-byte-boundary',
    label: '04 · UTF-8 every byte',
    summary: '把中文与 emoji 拆到任意 byte boundary。',
    question: '为什么 TextDecoder 必须跨 chunk 保留状态？',
    config: {
      ...BASE,
      presetId: 'utf8-byte-boundary',
      input: FOUNDATION_MARKDOWN,
      challenger: 'M1',
      sliceMode: 'boundary-aware',
      chunkMin: 1,
      chunkMax: 1,
      delayMin: 2,
      delayMax: 5,
      burstiness: 45,
      seed: 4,
    },
  },
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
    id: 'chat-completions-wire',
    label: '06 · Chat Completions wire',
    summary: '把 SSE data JSON 归一化为 reasoning、answer 与 terminal event。',
    question: '为什么 [DONE]、finish_reason 和 EOF 不能混成一种结束？',
    config: {
      ...BASE,
      presetId: 'chat-completions-wire',
      input: FOUNDATION_MARKDOWN,
      challenger: 'M1',
      chunkMin: 3,
      chunkMax: 11,
      delayMin: 5,
      delayMax: 18,
      burstiness: 55,
      seed: 6,
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
