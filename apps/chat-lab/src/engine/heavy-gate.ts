/**
 * Trailing-edge debounce that always renders the LATEST source and keeps the
 * last successful output when an attempt fails — the mermaid pattern: almost
 * every mid-stream state is unparseable and must not destroy the previous
 * good diagram.
 */
export interface HeavyGate {
  push(source: string): void
  /** Render immediately (used at terminal phases), skipping the delay. */
  flush(): void
  dispose(): void
}

export interface HeavyGateOptions {
  delayMs: number
  render: (source: string, attempt: number) => Promise<string>
  onSuccess: (output: string) => void
}

export function createHeavyGate(options: HeavyGateOptions): HeavyGate {
  let latest: string | null = null
  let attempt = 0
  let rendering = false
  let dirtyWhileRendering = false
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function fire(): void {
    clearTimer()
    if (disposed || latest === null) return
    if (rendering) {
      dirtyWhileRendering = true
      return
    }
    rendering = true
    attempt += 1
    const source = latest
    options
      .render(source, attempt)
      .then((output) => {
        if (!disposed) options.onSuccess(output)
      })
      .catch(() => {
        // keep the last successful output; this state was just "not yet"
      })
      .finally(() => {
        rendering = false
        if (dirtyWhileRendering && !disposed) {
          dirtyWhileRendering = false
          if (latest !== source) fire()
        }
      })
  }

  return {
    push(source) {
      if (disposed || source === latest) return
      latest = source
      clearTimer()
      timer = setTimeout(fire, options.delayMs)
    },
    flush: fire,
    dispose() {
      disposed = true
      clearTimer()
    },
  }
}
