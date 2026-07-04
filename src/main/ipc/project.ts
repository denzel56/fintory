import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { projectIpcChannels } from '../../shared/ipc/project.js'
import type { CreateProjectInput } from '../../shared/types/project.js'
import { validateCreateProjectInput } from '../../shared/validation/project.js'
import {
  closeCurrentProject,
  getCurrentProjectState,
  getProjectDefaultFileName,
  getProjectNameFromFilePath,
  openCurrentProject,
} from '../project/project-state.js'

export function registerProjectIpcHandlers(): void {
  ipcMain.handle(projectIpcChannels.getCurrent, () => getCurrentProjectState())

  ipcMain.handle(projectIpcChannels.create, async (event, input: unknown) => {
    const validationResult = validateCreateProjectInput(input)

    if (!validationResult.ok) {
      return {
        ok: false,
        code: 'invalid-project-name',
        message: validationResult.message,
      }
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const createInput: CreateProjectInput = validationResult.value
    const dialogOptions: SaveDialogOptions = {
      title: 'Create Fintory project',
      defaultPath: getProjectDefaultFileName(createInput.name),
      filters: [
        { name: 'Fintory project', extensions: ['fintory.sqlite'] },
        { name: 'SQLite database', extensions: ['sqlite'] },
      ],
    }
    const dialogResult = browserWindow
      ? await dialog.showSaveDialog(browserWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)

    if (dialogResult.canceled || !dialogResult.filePath) {
      return {
        ok: false,
        code: 'project-create-cancelled',
        message: 'Project creation was cancelled.',
      }
    }

    try {
      return {
        ok: true,
        project: openCurrentProject({
          filePath: dialogResult.filePath,
          name: createInput.name,
          seedDefaultCategories: true,
        }),
      }
    } catch {
      return {
        ok: false,
        code: 'project-database-open-failed',
        message: 'Project database could not be opened.',
      }
    }
  })

  ipcMain.handle(projectIpcChannels.open, async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: OpenDialogOptions = {
      title: 'Open Fintory project',
      properties: ['openFile'],
      filters: [
        { name: 'Fintory project', extensions: ['fintory.sqlite'] },
        { name: 'SQLite database', extensions: ['sqlite'] },
      ],
    }
    const dialogResult = browserWindow
      ? await dialog.showOpenDialog(browserWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return {
        ok: false,
        code: 'project-open-cancelled',
        message: 'Project open was cancelled.',
      }
    }

    const filePath = dialogResult.filePaths[0]

    if (!filePath) {
      return {
        ok: false,
        code: 'project-open-failed',
        message: 'Project file was not selected.',
      }
    }

    try {
      return {
        ok: true,
        project: openCurrentProject({
          filePath,
          name: getProjectNameFromFilePath(filePath),
        }),
      }
    } catch {
      return {
        ok: false,
        code: 'project-database-open-failed',
        message: 'Project database could not be opened.',
      }
    }
  })

  ipcMain.handle(projectIpcChannels.close, () => closeCurrentProject())
}
