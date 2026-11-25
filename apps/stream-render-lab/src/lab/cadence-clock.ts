import { BrowserClock, type Cancel, type EngineClock } from '../engine/clock'

export class CadenceClock implements EngineClock {
  private readonly browser = new BrowserClock()

  constructor(private readonly cadenceMs: number) {}

  now(): number {
    return this.browser.now()
  }

  frame(task: (timestamp: number) => void): Cancel {
    return this.browser.after(Math.max(1, this.cadenceMs), () => task(this.now()))
  }

  after(ms: number, task: () => void): Cancel {
    return this.browser.after(ms, task)
  }
}
