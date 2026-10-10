import type { ServiceAction, ServiceTransport } from '../../shared/types'

const webTransport: ServiceTransport = {
  async invoke<T>(action: ServiceAction, payload?: unknown): Promise<T> {
    const response = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    })
    const result: unknown = await response.json()
    if (typeof result !== 'object' || result === null)
      throw new Error('Invalid local service response.')
    const error: unknown = Reflect.get(result, 'error')
    if (!response.ok || typeof error === 'string')
      throw new Error(typeof error === 'string' ? error : 'Guoba Skills request failed.')
    const data: unknown = Reflect.get(result, 'data')
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- typed IPC/HTTP boundary mirrors ServiceTransport's requested result
    return data as T
  },
}

export const transport = window.guobaSkills ?? webTransport
export const isElectron = Boolean(window.guobaSkills)
