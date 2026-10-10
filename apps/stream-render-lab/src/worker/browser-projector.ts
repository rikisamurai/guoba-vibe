import { createBrowserProjectionPort } from './browser-port'
import type { Projector } from './types'
import { createWorkerProjector } from './worker-projector'

export function createBrowserWorkerProjector(): Projector {
  const worker = new Worker(new URL('./worker-entry.ts', import.meta.url), {
    name: 'stream-render-projector',
    type: 'module',
  })
  return createWorkerProjector({ port: createBrowserProjectionPort(worker) })
}
