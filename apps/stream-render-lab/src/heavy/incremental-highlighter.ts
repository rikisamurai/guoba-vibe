export interface HighlightResult<T> {
  stable: T[]
  unstable: T[]
}

export interface HighlightTokenizer<T> {
  enqueue(chunk: string): Promise<HighlightResult<T>>
  clear(): void
  close(): T[] | { stable: T[] }
}

export class IncrementalHighlighter<T> {
  private appliedSource = ''
  private needsRebuild = false
  private stable: T[] = []
  private unstable: T[] = []
  private queue: Promise<void> = Promise.resolve()
  enqueuedCodeUnits = 0

  constructor(private readonly tokenizer: HighlightTokenizer<T>) {}

  get tokens(): HighlightResult<T> {
    return { stable: [...this.stable], unstable: [...this.unstable] }
  }

  update(source: string): Promise<HighlightResult<T>> {
    return this.enqueue(() => this.apply(source))
  }

  finish(): Promise<HighlightResult<T>> {
    return this.enqueue(async () => {
      if (this.needsRebuild) await this.apply(this.appliedSource)
      try {
        const closed = this.tokenizer.close()
        const tail = Array.isArray(closed) ? closed : closed.stable
        this.stable.push(...tail)
        this.unstable = []
        return this.tokens
      } catch (error) {
        this.needsRebuild = true
        throw error
      }
    })
  }

  private enqueue(work: () => Promise<HighlightResult<T>>): Promise<HighlightResult<T>> {
    const result = this.queue.then(work)
    this.queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private async apply(source: string): Promise<HighlightResult<T>> {
    if (!this.needsRebuild && source === this.appliedSource) return this.tokens
    const rebuild = this.needsRebuild || !source.startsWith(this.appliedSource)
    const chunk = rebuild ? source : source.slice(this.appliedSource.length)
    // A rejected enqueue may have already advanced the tokenizer.
    this.needsRebuild = true
    if (rebuild) this.tokenizer.clear()
    this.enqueuedCodeUnits += chunk.length
    const result = await this.tokenizer.enqueue(chunk)
    if (rebuild) this.stable = []
    this.stable.push(...result.stable)
    this.unstable = [...result.unstable]
    this.appliedSource = source
    this.needsRebuild = false
    return this.tokens
  }
}
