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

  try {
    const devServerUrl = new URL(configuredUrl)

    if (
      devServerUrl.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(devServerUrl.hostname)
    ) {
      return null
    }

    return devServerUrl
  } catch {
    return null
  }
}

const isAllowedNavigation = (
  targetUrl: string,
  devServerUrl: URL | null,
  rendererBuildUrl: string,
): boolean => {
  let parsedTargetUrl: URL

  try {
    parsedTargetUrl = new URL(targetUrl)
  } catch {
    return false
  }

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
