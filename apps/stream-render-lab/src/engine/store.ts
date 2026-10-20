import type { ReadonlyStore } from './types'

export interface WritableStore<T> extends ReadonlyStore<T> {
  publish(value: T): void
}

export function createStore<T>(initial: T): WritableStore<T> {
  let current = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => current,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    publish(value) {
      if (Object.is(value, current)) return
      current = value
      for (const listener of listeners) {
        try {
          listener()
        } catch (error) {
          reportListenerError(error)
        }
      }
    },
  }
}

function reportListenerError(error: unknown): void {
  const report: unknown = Reflect.get(globalThis, 'reportError')
  if (typeof report === 'function') {
    Reflect.apply(report, globalThis, [error])
    return
  }
  console.error('StreamingRenderEngine subscriber failed', error)
}
