import type { FintoryApi } from '../../shared/ipc/app'

declare global {
  interface Window {
    fintory?: FintoryApi
  }
}

export {}
