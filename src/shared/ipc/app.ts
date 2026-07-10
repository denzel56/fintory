import type { CategoriesApi } from './categories.js'
import type { ImportApi } from './import.js'
import type { ProjectApi } from './project.js'
import type { TransactionsApi } from './transactions.js'

export const appIpcChannels = {
  getVersion: 'app:getVersion',
} as const

export type FintoryApi = {
  app: {
    getVersion: () => Promise<string>
  }
  categories: CategoriesApi
  import: ImportApi
  project: ProjectApi
  transactions: TransactionsApi
}
