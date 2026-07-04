import { registerAppIpcHandlers } from './app.js'
import { registerCategoriesIpcHandlers } from './categories.js'
import { registerProjectIpcHandlers } from './project.js'

export function registerIpcHandlers(): void {
  registerAppIpcHandlers()
  registerCategoriesIpcHandlers()
  registerProjectIpcHandlers()
}
