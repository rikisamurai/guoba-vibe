import 'server-only'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { isRecord } from './json'
import type { TweetVideo, VideoVariant } from './media'

const execFileAsync = promisify(execFile)
const packagedYtDlpPaths = [
  join(process.cwd(), 'bin', 'yt-dlp'),
  join(process.cwd(), 'apps', 'x-video-downloader', 'bin', 'yt-dlp'),
]

type RawInfo = {
  duration?: number
  entries?: RawInfo[]
  formats?: RawFormat[]
  id?: string
  thumbnail?: string
  title?: string
  url?: string
}

type RawFormat = {
  ext?: string
  filesize?: number
  filesize_approx?: number
  format_id?: string
  format_note?: string
  height?: number
  protocol?: string
  tbr?: number
  url?: string
  vcodec?: string
  width?: number
}

export async function getYtDlpInfo(url: string): Promise<unknown> {
  const binary = process.env.XVD_YTDLP_PATH || resolvePackagedYtDlpPath()
  try {
    const { stdout } = await execFileAsync(
      binary,
      ['--dump-single-json', '--no-playlist', '--no-warnings', url],
      { maxBuffer: 20 * 1024 * 1024, timeout: 45_000 },
    )
    return JSON.parse(stdout)
  } catch (error) {
    throw new Error(toYtDlpErrorMessage(error), { cause: error })
  }
}

function resolvePackagedYtDlpPath(): string {
  return packagedYtDlpPaths.find(existsSync) ?? 'yt-dlp'
}

export function toYtDlpErrorMessage(error: unknown): string {
  const message = getErrorText(error)
  if (message.includes('No video could be found in this tweet')) {
    return '解析器未识别到视频，请确认这条推文包含可公开访问的视频'
  }
  if (message.includes('Bad guest token')) {
    return 'X 临时拒绝公开视频解析请求，请稍后重试或换一个可公开访问的视频推文'
  }
  if (message.includes('timed out') || message.includes('ETIMEDOUT')) {
    return '解析超时，请稍后重试'
  }
  if (message.includes('ENOENT')) {
    return '服务端未找到视频解析器，请检查部署配置'
  }
  return '解析失败，请确认链接是可公开访问的 X 视频推文'
}

function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const details = error as Error & { stderr?: string; stdout?: string }
  return [details.stderr, details.stdout, details.message].filter(Boolean).join('\n')
}

export function normalizeYtDlpInfo(info: unknown, fallbackTitle = 'X video'): TweetVideo[] {
  const raw = isRawInfo(info) ? info : {}
  const rawEntries = Array.isArray(raw.entries) && raw.entries.length > 0 ? raw.entries : [raw]
  const entries = rawEntries.filter(isRawInfo)

  return entries
    .map((entry, index) => toVideo(entry, index, raw.title ?? fallbackTitle))
    .filter((video): video is TweetVideo => Boolean(video))
}

function toVideo(entry: RawInfo, index: number, fallbackTitle: string): TweetVideo | null {
  const variants = collectVariants(entry)
  if (variants.length === 0) return null

  return {
    id: entry.id ?? `video-${index + 1}`,
    title: entry.title ?? fallbackTitle,
    thumbnail: entry.thumbnail,
    durationMs: typeof entry.duration === 'number' ? Math.round(entry.duration * 1000) : undefined,
    variants,
  }
}

function collectVariants(entry: RawInfo): VideoVariant[] {
  const formats = Array.isArray(entry.formats) ? entry.formats.filter(isRawFormat) : []
  const variants = formats.filter(isVideoFormat).map(toVariant)

  if (variants.length === 0 && entry.url?.includes('.mp4')) {
    variants.push({ id: 'direct', label: 'MP4', url: entry.url, ext: 'mp4' })
  }

  return dedupeVariantsByQuality(variants.toSorted(compareVariant))
}

function isVideoFormat(format: RawFormat): boolean {
  return Boolean(
    format.url?.startsWith('https://') &&
    format.vcodec !== 'none' &&
    (format.ext === 'mp4' || format.url.includes('.mp4')),
  )
}

function toVariant(format: RawFormat, index: number): VideoVariant {
  const height = numberOrUndefined(format.height)
  const width = numberOrUndefined(format.width)
  const bitrate = numberOrUndefined(format.tbr)

  return {
    id: format.format_id ?? `format-${index + 1}`,
    label: height ? `${height}p` : (format.format_note ?? format.format_id ?? 'MP4'),
    url: format.url ?? '',
    bitrate,
    ext: format.ext,
    height,
    width,
  }
}

function compareVariant(left: VideoVariant, right: VideoVariant): number {
  return (
    (right.height ?? 0) - (left.height ?? 0) ||
    directScore(right) - directScore(left) ||
    (right.bitrate ?? 0) - (left.bitrate ?? 0)
  )
}

function dedupeVariantsByQuality(variants: VideoVariant[]): VideoVariant[] {
  const seen = new Set<string>()
  return variants.filter((variant) => {
    const key = variant.height ? `${variant.height}` : variant.label
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function directScore(variant: VideoVariant): number {
  return variant.url.includes('.mp4') ? 1 : 0
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRawInfo(value: unknown): value is RawInfo {
  return isRecord(value)
}

function isRawFormat(value: unknown): value is RawFormat {
  return isRecord(value)
}
