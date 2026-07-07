import { chmod, mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assets = new Map([
  ['darwin:arm64', 'yt-dlp_macos'],
  ['darwin:x64', 'yt-dlp_macos'],
  ['linux:arm64', 'yt-dlp_linux_aarch64'],
  ['linux:x64', 'yt-dlp_linux'],
  ['win32:x64', 'yt-dlp.exe'],
])

const scriptDir = dirname(fileURLToPath(import.meta.url))
const targetDir = join(scriptDir, '..', 'bin')
const targetPath = join(targetDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
const assetName = process.env.XVD_YTDLP_ASSET || assets.get(`${process.platform}:${process.arch}`)

if (!assetName) {
  throw new Error(`No yt-dlp standalone asset for ${process.platform}/${process.arch}`)
}

if (!process.env.XVD_FORCE_YTDLP_DOWNLOAD && (await exists(targetPath))) {
  console.log(`yt-dlp already installed at ${targetPath}`)
  process.exit(0)
}

const downloadUrl =
  process.env.XVD_YTDLP_DOWNLOAD_URL ||
  `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`

console.log(`Downloading ${assetName} from ${downloadUrl}`)
const response = await fetch(downloadUrl)
if (!response.ok) {
  throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`)
}

await mkdir(targetDir, { recursive: true })
await writeFile(targetPath, Buffer.from(await response.arrayBuffer()))
await chmod(targetPath, 0o755)
console.log(`Installed yt-dlp at ${targetPath}`)

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
