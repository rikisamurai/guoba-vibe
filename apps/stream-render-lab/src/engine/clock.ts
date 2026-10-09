export type Cancel = () => void

export interface EngineClock {
  now(): number
  frame(task: (timestamp: number) => void): Cancel
  after(ms: number, task: () => void): Cancel
}

export interface BrowserClockRuntime {
  now(): number
  requestFrame(task: (timestamp: number) => void): number
  cancelFrame(handle: number): void
  setTimer(task: () => void, ms: number): number
  clearTimer(handle: number): void
}

const browserRuntime: BrowserClockRuntime = {
  now: () => performance.now(),
  requestFrame: (task) => requestAnimationFrame(task),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  setTimer: (task, ms) => window.setTimeout(task, ms),
  clearTimer: (handle) => window.clearTimeout(handle),
}

export class BrowserClock implements EngineClock {
  constructor(private readonly runtime = browserRuntime) {}

  now(): number {
    return this.runtime.now()
  }

  frame(task: (timestamp: number) => void): Cancel {
    const handle = this.runtime.requestFrame(task)
    return () => this.runtime.cancelFrame(handle)
  }

  after(ms: number, task: () => void): Cancel {
    const handle = this.runtime.setTimer(task, ms)
    return () => this.runtime.clearTimer(handle)
  }
}

interface ScheduledTask {
  id: number
  due: number
  order: number
  kind: 'frame' | 'timer'
  task: (timestamp: number) => void
  cancelled: boolean
}

export class VirtualClock implements EngineClock {
  private time = 0
  private nextId = 0
  private tasks: ScheduledTask[] = []
  readonly frameDuration: number

  constructor(options: { frameDuration?: number } = {}) {
    this.frameDuration = options.frameDuration ?? 16
  }

  get pendingCount(): number {
    return this.tasks.filter((task) => !task.cancelled).length
  }

  now(): number {
    return this.time
  }

  frame(task: (timestamp: number) => void): Cancel {
    return this.schedule('frame', this.nextFrameTime(), task)
  }

  after(ms: number, task: () => void): Cancel {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError('Timer delay must be a non-negative finite number')
    }
    return this.schedule('timer', this.time + ms, () => task())
  }

  advanceBy(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError('Clock advance must be a non-negative finite number')
    }
    this.advanceTo(this.time + ms)
  }

  advanceFrame(): void {
    this.advanceTo(this.nextFrameTime())
  }

  runUntilIdle(maxTasks = 10_000): void {
    let executed = 0
    while (this.pendingCount > 0) {
      if (executed >= maxTasks) throw new Error(`VirtualClock exceeded ${maxTasks} tasks`)
      const next = this.nextPending()
      if (!next) return
      this.time = next.due
      this.execute(next)
      executed += 1
    }
  }

  private nextFrameTime(): number {
    return (Math.floor(this.time / this.frameDuration) + 1) * this.frameDuration
  }

  private schedule(kind: ScheduledTask['kind'], due: number, task: ScheduledTask['task']): Cancel {
    const scheduled: ScheduledTask = {
      id: this.nextId,
      due,
      order: this.nextId,
      kind,
      task,
      cancelled: false,
    }
    this.nextId += 1
    this.tasks.push(scheduled)
    return () => {
      scheduled.cancelled = true
    }
  }

  private advanceTo(target: number): number {
    let executed = 0
    while (true) {
      const next = this.nextPending()
      if (!next || next.due > target) break
      if (executed >= 10_000) throw new Error('VirtualClock exceeded 10000 tasks')
      this.time = next.due
      this.execute(next)
      executed += 1
    }
    this.time = target
    this.removeCancelled()
    return executed
  }

  private execute(task: ScheduledTask): void {
    this.tasks = this.tasks.filter((candidate) => candidate.id !== task.id)
    if (task.cancelled) return
    task.task(this.time)
    this.removeCancelled()
  }

  private nextPending(): ScheduledTask | undefined {
    return this.tasks
      .filter((task) => !task.cancelled)
      .toSorted((left, right) => left.due - right.due || left.order - right.order)[0]
  }

  private removeCancelled(): void {
    this.tasks = this.tasks.filter((task) => !task.cancelled)
  }
}
