import { registerAppIpcHandlers } from './app.js'
import { registerProjectIpcHandlers } from './project.js'

export function registerIpcHandlers(): void {
  registerAppIpcHandlers()
  registerProjectIpcHandlers()
}
