import { contextBridge, ipcRenderer } from 'electron'
import { appIpcChannels } from '../shared/ipc/app.js'
import type { FintoryApi } from '../shared/ipc/app.js'

const fintoryApi: FintoryApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(appIpcChannels.getVersion) as Promise<string>,
  },
}

contextBridge.exposeInMainWorld('fintory', fintoryApi)
