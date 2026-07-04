import type { CategoriesApi } from './categories.js'
import type { ProjectApi } from './project.js'

export const appIpcChannels = {
  getVersion: 'app:getVersion',
} as const

export type FintoryApi = {
  app: {
    getVersion: () => Promise<string>
  }
  categories: CategoriesApi
  project: ProjectApi
}
