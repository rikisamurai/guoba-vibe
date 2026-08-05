import { useSyncExternalStore } from 'react'

/**
 * Minimal external store — deliberately hand-rolled instead of pulling in a
 * state library; useSyncExternalStore keeps React 19 tear-free.
 */
export interface Store<T> {
  get(this: void): T
  set(this: void, update: (state: T) => T): void
  subscribe(this: void, listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(update) {
      state = update(state)
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}
