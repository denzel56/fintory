import { contextBridge, ipcRenderer } from 'electron'
import { appIpcChannels } from '../shared/ipc/app.js'
import { categoriesIpcChannels } from '../shared/ipc/categories.js'
import { projectIpcChannels } from '../shared/ipc/project.js'
import type { FintoryApi } from '../shared/ipc/app.js'

const fintoryApi: FintoryApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(appIpcChannels.getVersion) as Promise<string>,
  },
  categories: {
    create: (input) => ipcRenderer.invoke(categoriesIpcChannels.create, input),
    delete: (input) => ipcRenderer.invoke(categoriesIpcChannels.delete, input),
    list: () => ipcRenderer.invoke(categoriesIpcChannels.list),
    update: (input) => ipcRenderer.invoke(categoriesIpcChannels.update, input),
  },
  project: {
    close: () => ipcRenderer.invoke(projectIpcChannels.close),
    create: (input) => ipcRenderer.invoke(projectIpcChannels.create, input),
    getCurrent: () => ipcRenderer.invoke(projectIpcChannels.getCurrent),
    open: () => ipcRenderer.invoke(projectIpcChannels.open),
  },
}

contextBridge.exposeInMainWorld('fintory', fintoryApi)
