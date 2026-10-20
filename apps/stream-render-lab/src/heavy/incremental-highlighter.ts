export interface HighlightResult<T> {
  stable: T[]
  unstable: T[]
}

export interface HighlightTokenizer<T> {
  enqueue(chunk: string): Promise<HighlightResult<T>>
  clear(): void
  close(): T[] | { stable: T[] }
}

interface HighlightJob {
  source: string
  chunk: string
  rebuild: boolean
}

export class IncrementalHighlighter<T> {
  private requestedSource = ''
  private stable: T[] = []
  private unstable: T[] = []
  private queue: Promise<void> = Promise.resolve()
  enqueuedCodeUnits = 0

  constructor(private readonly tokenizer: HighlightTokenizer<T>) {}

  get tokens(): HighlightResult<T> {
    return { stable: [...this.stable], unstable: [...this.unstable] }
  }

  update(source: string): Promise<HighlightResult<T>> {
    if (source === this.requestedSource) return this.queue.then(() => this.tokens)
    const rebuild = !source.startsWith(this.requestedSource)
    const chunk = rebuild ? source : source.slice(this.requestedSource.length)
    this.requestedSource = source
    const job: HighlightJob = { source, chunk, rebuild }
    let result = this.tokens
    this.queue = this.queue.then(async () => {
      result = await this.run(job)
    })
    return this.queue.then(() => result)
  }

  finish(): Promise<HighlightResult<T>> {
    let result = this.tokens
    this.queue = this.queue.then(() => {
      const closed = this.tokenizer.close()
      const tail = Array.isArray(closed) ? closed : closed.stable
      this.stable.push(...tail)
      this.unstable = []
      result = this.tokens
    })
    return this.queue.then(() => result)
  }

  private async run(job: HighlightJob): Promise<HighlightResult<T>> {
    if (job.rebuild) {
      this.tokenizer.clear()
      this.stable = []
      this.unstable = []
    }
    this.enqueuedCodeUnits += job.chunk.length
    const result = await this.tokenizer.enqueue(job.chunk)
    this.stable.push(...result.stable)
    this.unstable = [...result.unstable]
    return this.tokens
  }
}
