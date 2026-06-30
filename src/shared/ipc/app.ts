export const appIpcChannels = {
  getVersion: 'app:getVersion',
} as const

export type FintoryApi = {
  app: {
    getVersion: () => Promise<string>
  }
}
