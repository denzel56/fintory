import type { FintoryApi } from '../shared/ipc/app.js'

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

const appIpcChannels = {
  getVersion: 'app:getVersion',
} as const

const categoriesIpcChannels = {
  create: 'categories:create',
  delete: 'categories:delete',
  list: 'categories:list',
  update: 'categories:update',
} as const

const importIpcChannels = {
  listBatches: 'import:listBatches',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

const projectIpcChannels = {
  close: 'project:close',
  create: 'project:create',
  getCurrent: 'project:getCurrent',
  open: 'project:open',
} as const

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
  import: {
    listBatches: () => ipcRenderer.invoke(importIpcChannels.listBatches),
    selectCsvFiles: () => ipcRenderer.invoke(importIpcChannels.selectCsvFiles),
  },
  project: {
    close: () => ipcRenderer.invoke(projectIpcChannels.close),
    create: (input) => ipcRenderer.invoke(projectIpcChannels.create, input),
    getCurrent: () => ipcRenderer.invoke(projectIpcChannels.getCurrent),
    open: () => ipcRenderer.invoke(projectIpcChannels.open),
  },
}

contextBridge.exposeInMainWorld('fintory', fintoryApi)
