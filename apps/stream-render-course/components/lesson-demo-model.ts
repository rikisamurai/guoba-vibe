import {
  isDemoReport,
  type DemoReport,
  type LessonDemoId,
  type LessonPresetId,
} from '@stream-render/contract'

const DEFAULT_LAB_ORIGIN = 'http://localhost:5174'

export interface DemoUrls {
  embed: string
  fullLab: string
  origin: string
}

interface MessageLike {
  data: unknown
  origin: string
  source: unknown
}

interface ExpectedMessage {
  demoId: LessonDemoId
  origin: string
  source: unknown
}

export function createDemoUrls(
  demoId: LessonDemoId,
  presetId: LessonPresetId,
  configuredOrigin = import.meta.env.PUBLIC_LAB_ORIGIN,
): DemoUrls {
  const origin = normalizeLabOrigin(configuredOrigin)
  const query = new URLSearchParams({ preset: presetId })
  return {
    embed: `${origin}/embed/${encodeURIComponent(demoId)}?${query}`,
    fullLab: `${origin}/lab?${new URLSearchParams({ demo: demoId, preset: presetId })}`,
    origin,
  }
}

export function acceptDemoReport(
  message: MessageLike,
  expected: ExpectedMessage,
): DemoReport | undefined {
  if (message.origin !== expected.origin || message.source !== expected.source) return undefined
  if (!isDemoReport(message.data) || message.data.demoId !== expected.demoId) return undefined
  return message.data
}

function normalizeLabOrigin(configuredOrigin: string | undefined): string {
  const candidate = configuredOrigin?.trim() || DEFAULT_LAB_ORIGIN
  const url = new URL(candidate)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('PUBLIC_LAB_ORIGIN must use http or https')
  }
  return url.origin
}
