import { existsSync } from 'node:fs'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { projectIpcChannels } from '../../shared/ipc/project.js'
import type {
  CreateProjectInput,
  CreateProjectResult,
  OpenProjectResult,
  ProjectErrorCode,
} from '../../shared/types/project.js'
import { validateCreateProjectInput } from '../../shared/validation/project.js'
import { ProjectDatabaseConnectionError } from '../db/project-database-connection.js'
import {
  closeCurrentProject,
  getCurrentProjectState,
  getProjectDefaultFileName,
  getProjectNameFromFilePath,
  openCurrentProject,
} from '../project/project-state.js'

const projectDatabaseFailureMessages: Partial<Record<ProjectErrorCode, string>> = {
  'project-database-corrupt':
    'This project database could not be read safely. Choose another project or restore a backup.',
  'project-database-locked':
    'This project database appears to be in use by another process. Close other apps using it, then try again.',
  'project-database-open-failed':
    'Project database could not be opened. Choose another project or try again.',
  'project-migration-failed':
    'Project database could not be prepared for this app version. Choose another project or restore a backup.',
}

const toProjectDatabaseFailureResult = (
  error: unknown,
): Extract<CreateProjectResult | OpenProjectResult, { ok: false }> => {
  if (error instanceof ProjectDatabaseConnectionError) {
    return {
      ok: false,
      code: error.code,
      message:
        projectDatabaseFailureMessages[error.code] ??
        'Project database could not be opened. Choose another project or try again.',
    }
  }

  return {
    ok: false,
    code: 'project-database-open-failed',
    message: 'Project database could not be opened. Choose another project or try again.',
  }
}

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
      const projectFileAlreadyExists = existsSync(dialogResult.filePath)

      return {
        ok: true,
        project: openCurrentProject({
          filePath: dialogResult.filePath,
          name: createInput.name,
          seedDefaultCategories: !projectFileAlreadyExists,
        }),
      }
    } catch (error) {
      return toProjectDatabaseFailureResult(error)
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

    if (!existsSync(filePath)) {
      return {
        ok: false,
        code: 'project-not-found',
        message: 'Selected project file is no longer available. Choose another project file.',
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
    } catch (error) {
      return toProjectDatabaseFailureResult(error)
    }
  })

  ipcMain.handle(projectIpcChannels.close, () => closeCurrentProject())
}
