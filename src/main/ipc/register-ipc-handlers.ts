import { registerAppIpcHandlers } from './app.js'
import { registerCategoriesIpcHandlers } from './categories.js'
import { registerImportIpcHandlers } from './import.js'
import { registerProjectIpcHandlers } from './project.js'

export function registerIpcHandlers(): void {
  registerAppIpcHandlers()
  registerCategoriesIpcHandlers()
  registerImportIpcHandlers()
  registerProjectIpcHandlers()
}
