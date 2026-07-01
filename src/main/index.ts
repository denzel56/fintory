import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './app/create-main-window.js'
import { registerIpcHandlers } from './ipc/register-ipc-handlers.js'

app.whenReady().then(() => {
  registerIpcHandlers()
  void createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
