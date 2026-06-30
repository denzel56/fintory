import { app, ipcMain } from 'electron'
import { appIpcChannels } from '../../shared/ipc/app.js'

export function registerAppIpcHandlers(): void {
  ipcMain.handle(appIpcChannels.getVersion, () => app.getVersion())
}
