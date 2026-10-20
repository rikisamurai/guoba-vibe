import type { HostSchedulingCapabilities } from './adaptive-frame-scheduler'

interface NativePostTaskOptions {
  priority: 'user-visible'
  signal: AbortSignal
}

interface InputPendingOptions {
  includeContinuous: boolean
}

export interface BrowserSchedulingRuntime {
  postTask?: (task: () => void, options: NativePostTaskOptions) => Promise<unknown>
  isInputPending?: (options: InputPendingOptions) => boolean
  createAbortController?: () => AbortController
  reportError?: (error: unknown) => void
}

function readMember(owner: unknown, key: string): unknown {
  const isObject = typeof owner === 'object' && owner !== null
  if (!isObject && typeof owner !== 'function') return undefined
  return Reflect.get(owner, key)
}

function readBrowserRuntime(): BrowserSchedulingRuntime {
  const scheduler = readMember(globalThis, 'scheduler')
  const postTask = readMember(scheduler, 'postTask')
  const navigator = readMember(globalThis, 'navigator')
  const scheduling = readMember(navigator, 'scheduling')
  const isInputPending = readMember(scheduling, 'isInputPending')
  const reportError = readMember(globalThis, 'reportError')
  return {
    postTask:
      typeof postTask === 'function'
        ? (task, options) => Promise.resolve(Reflect.apply(postTask, scheduler, [task, options]))
        : undefined,
    isInputPending:
      typeof isInputPending === 'function'
        ? (options) => Boolean(Reflect.apply(isInputPending, scheduling, [options]))
        : undefined,
    reportError:
      typeof reportError === 'function'
        ? (error) => Reflect.apply(reportError, globalThis, [error])
        : undefined,
  }
}

export function createBrowserSchedulingCapabilities(
  runtime: BrowserSchedulingRuntime = readBrowserRuntime(),
): HostSchedulingCapabilities {
  const capabilities: HostSchedulingCapabilities = {}

  if (runtime.postTask) {
    capabilities.postTask = (task) => {
      const controller = (runtime.createAbortController ?? (() => new AbortController()))()
      const guardedTask = () => {
        if (!controller.signal.aborted) task()
      }
      void runtime
        .postTask?.(guardedTask, {
          priority: 'user-visible',
          signal: controller.signal,
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) runtime.reportError?.(error)
        })
      return () => controller.abort()
    }
  }

  if (runtime.isInputPending) {
    capabilities.isInputPending = () =>
      runtime.isInputPending?.({ includeContinuous: true }) ?? false
  }

  return capabilities
}
