import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { getDevServerUrl, registerNavigationSecurity } from './navigation-security.js'

const getAppAssetPath = (...segments: string[]): string =>
  path.join(app.getAppPath(), ...segments)

export const createMainWindow = async (): Promise<void> => {
  const devServerUrl = getDevServerUrl()
  const rendererBuildPath = getAppAssetPath('dist', 'index.html')
  const preloadPath = getAppAssetPath('dist-electron', 'preload', 'index.cjs')
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 620,
    title: 'Fintory',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: true,
    },
  })

  registerNavigationSecurity({
    devServerUrl,
    rendererBuildPath,
    webContents: mainWindow.webContents,
  })

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl.toString())
    return
  }

  await mainWindow.loadFile(rendererBuildPath)
}
