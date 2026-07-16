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
  clearHistory: 'import:clearHistory',
  findCsvMappingProfiles: 'import:findCsvMappingProfiles',
  importCsvFileWithMapping: 'import:importCsvFileWithMapping',
  importCsvFiles: 'import:importCsvFiles',
  listBatches: 'import:listBatches',
  previewCsvFile: 'import:previewCsvFile',
  saveCsvMappingProfile: 'import:saveCsvMappingProfile',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

const projectIpcChannels = {
  close: 'project:close',
  create: 'project:create',
  getCurrent: 'project:getCurrent',
  open: 'project:open',
} as const

const transactionsIpcChannels = {
  getFilters: 'transactions:getFilters',
  list: 'transactions:list',
  updateCategory: 'transactions:updateCategory',
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
    clearHistory: () => ipcRenderer.invoke(importIpcChannels.clearHistory),
    findCsvMappingProfiles: (input) =>
      ipcRenderer.invoke(importIpcChannels.findCsvMappingProfiles, input),
    importCsvFileWithMapping: (input) =>
      ipcRenderer.invoke(importIpcChannels.importCsvFileWithMapping, input),
    importCsvFiles: (input) => ipcRenderer.invoke(importIpcChannels.importCsvFiles, input),
    listBatches: () => ipcRenderer.invoke(importIpcChannels.listBatches),
    previewCsvFile: (input) => ipcRenderer.invoke(importIpcChannels.previewCsvFile, input),
    saveCsvMappingProfile: (input) =>
      ipcRenderer.invoke(importIpcChannels.saveCsvMappingProfile, input),
    selectCsvFiles: () => ipcRenderer.invoke(importIpcChannels.selectCsvFiles),
  },
  project: {
    close: () => ipcRenderer.invoke(projectIpcChannels.close),
    create: (input) => ipcRenderer.invoke(projectIpcChannels.create, input),
    getCurrent: () => ipcRenderer.invoke(projectIpcChannels.getCurrent),
    open: () => ipcRenderer.invoke(projectIpcChannels.open),
  },
  transactions: {
    getFilters: () => ipcRenderer.invoke(transactionsIpcChannels.getFilters),
    list: (query) => ipcRenderer.invoke(transactionsIpcChannels.list, query),
    updateCategory: (input) => ipcRenderer.invoke(transactionsIpcChannels.updateCategory, input),
  },
}

contextBridge.exposeInMainWorld('fintory', fintoryApi)
