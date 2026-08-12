import { contextBridge, ipcRenderer } from 'electron'

import type { ServiceAction, ServiceTransport } from '../shared/types'

const transport: ServiceTransport = {
  invoke: <T>(action: ServiceAction, payload?: unknown): Promise<T> =>
    ipcRenderer.invoke('guoba-skills:invoke', action, payload),
}

contextBridge.exposeInMainWorld('guobaSkills', transport)
