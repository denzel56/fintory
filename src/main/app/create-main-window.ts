import { BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDevServerUrl, registerNavigationSecurity } from './navigation-security.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const projectRoot = path.resolve(currentDirectory, '../../..')
const rendererBuildPath = path.join(projectRoot, 'dist', 'index.html')
const preloadPath = path.join(projectRoot, 'dist-electron', 'preload', 'index.js')

export const createMainWindow = async (): Promise<void> => {
  const devServerUrl = getDevServerUrl()
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
