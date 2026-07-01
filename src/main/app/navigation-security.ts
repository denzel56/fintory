import type { WebContents } from 'electron'
import { pathToFileURL } from 'node:url'

type NavigationSecurityOptions = {
  devServerUrl: URL | null
  rendererBuildPath: string
  webContents: WebContents
}

export const getDevServerUrl = (): URL | null => {
  const configuredUrl = process.env.VITE_DEV_SERVER_URL

  if (!configuredUrl) {
    return null
  }

  return new URL(configuredUrl)
}

const isAllowedNavigation = (
  targetUrl: string,
  devServerUrl: URL | null,
  rendererBuildUrl: string,
): boolean => {
  const parsedTargetUrl = new URL(targetUrl)

  if (devServerUrl) {
    return parsedTargetUrl.origin === devServerUrl.origin
  }

  return targetUrl.startsWith(rendererBuildUrl)
}

export const registerNavigationSecurity = ({
  devServerUrl,
  rendererBuildPath,
  webContents,
}: NavigationSecurityOptions): void => {
  const rendererBuildUrl = pathToFileURL(rendererBuildPath).toString()

  webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl, devServerUrl, rendererBuildUrl)) {
      event.preventDefault()
    }
  })
}
