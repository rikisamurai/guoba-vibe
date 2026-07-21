type ReadableFile = Pick<File, 'name' | 'text'>

export type LatestFileRead =
  | { kind: 'empty' }
  | { kind: 'failed' }
  | { kind: 'stale' }
  | { kind: 'loaded'; fileName: string; raw: string }

export function createLatestFileReader() {
  let latestRequest = 0

  return {
    async read(file: ReadableFile | undefined): Promise<LatestFileRead> {
      const request = ++latestRequest
      if (!file) return { kind: 'empty' }

      try {
        const raw = await file.text()
        return request === latestRequest
          ? { kind: 'loaded', fileName: file.name, raw }
          : { kind: 'stale' }
      } catch {
        return request === latestRequest ? { kind: 'failed' } : { kind: 'stale' }
      }
    },
  }
}
