import { app, BrowserWindow } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const projectRoot = path.resolve(currentDirectory, '../..')
const rendererBuildPath = path.join(projectRoot, 'dist', 'index.html')
const rendererBuildUrl = pathToFileURL(rendererBuildPath).toString()

const getDevServerUrl = (): URL | null => {
  const configuredUrl = process.env.VITE_DEV_SERVER_URL

  if (!configuredUrl) {
    return null
  }

  return new URL(configuredUrl)
}

const isAllowedNavigation = (targetUrl: string, devServerUrl: URL | null): boolean => {
  const parsedTargetUrl = new URL(targetUrl)

  if (devServerUrl) {
    return parsedTargetUrl.origin === devServerUrl.origin
  }

  return targetUrl.startsWith(rendererBuildUrl)
}

const createMainWindow = async (): Promise<void> => {
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
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl, devServerUrl)) {
      event.preventDefault()
    }
  })

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl.toString())
    return
  }

  await mainWindow.loadFile(rendererBuildPath)
}

app.whenReady().then(() => {
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
