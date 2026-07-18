import { registerAnalyticsIpcHandlers } from './analytics.js'
import { registerAppIpcHandlers } from './app.js'
import { registerCategoriesIpcHandlers } from './categories.js'
import { registerImportIpcHandlers } from './import.js'
import { registerProjectIpcHandlers } from './project.js'
import { registerTransactionsIpcHandlers } from './transactions.js'

export function registerIpcHandlers(): void {
  registerAnalyticsIpcHandlers()
  registerAppIpcHandlers()
  registerCategoriesIpcHandlers()
  registerImportIpcHandlers()
  registerProjectIpcHandlers()
  registerTransactionsIpcHandlers()
}
