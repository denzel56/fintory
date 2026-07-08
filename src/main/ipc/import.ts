import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { importIpcChannels } from '../../shared/ipc/import.js'
import type {
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ImportBatchDto,
  ListImportBatchesResult,
  SelectCsvFilesResult,
  SelectedCsvFileMetadata,
} from '../../shared/types/import.js'
import { getActiveProjectDatabase } from '../db/project-database-connection.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { importCsvFiles } from '../import/csv-import-service.js'

const selectedCsvFilePathsById = new Map<string, string>()

type SelectedCsvFile = {
  readonly filePath: string
  readonly metadata: SelectedCsvFileMetadata
}

const getSelectedCsvFile = async (filePath: string): Promise<SelectedCsvFile | null> => {
  const extension = extname(filePath).toLowerCase()

  if (extension !== '.csv') {
    return null
  }

  const fileStats = await stat(filePath)
  const selectionId = randomUUID()

  return {
    filePath,
    metadata: {
      extension,
      fileName: basename(filePath),
      selectionId,
      sizeBytes: fileStats.size,
    },
  }
}

const replaceSelectedCsvFilePaths = (files: readonly SelectedCsvFile[]): void => {
  selectedCsvFilePathsById.clear()

  for (const file of files) {
    selectedCsvFilePathsById.set(file.metadata.selectionId, file.filePath)
  }
}

const toImportBatchDto = (batch: {
  readonly adapterId: string
  readonly duplicateCount: number
  readonly failedCount: number
  readonly id: string
  readonly importedAt: string
  readonly insertedCount: number
  readonly rowCount: number
  readonly sourceFileName: string
}): ImportBatchDto => ({
  adapterId: batch.adapterId,
  duplicateCount: batch.duplicateCount,
  failedCount: batch.failedCount,
  id: batch.id,
  importedAt: batch.importedAt,
  insertedCount: batch.insertedCount,
  rowCount: batch.rowCount,
  sourceFileName: batch.sourceFileName,
})

export const getSelectedCsvFilePath = (selectionId: string): string | undefined =>
  selectedCsvFilePathsById.get(selectionId)

const isImportCsvFilesInput = (input: unknown): input is ImportCsvFilesInput => {
  if (typeof input !== 'object' || input === null || !('selectionIds' in input)) {
    return false
  }

  const selectionIds = (input as { readonly selectionIds: unknown }).selectionIds

  return (
    Array.isArray(selectionIds) &&
    selectionIds.length > 0 &&
    selectionIds.every((selectionId) => typeof selectionId === 'string' && selectionId.length > 0)
  )
}

const isString = (value: string | undefined): value is string => typeof value === 'string'

export function registerImportIpcHandlers(): void {
  ipcMain.handle(
    importIpcChannels.importCsvFiles,
    async (_event, input: unknown): Promise<ImportCsvFilesResult> => {
      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before importing CSV files.',
        }
      }

      if (!isImportCsvFilesInput(input)) {
        return {
          ok: false,
          code: 'invalid-csv-import-input',
          message: 'Select one or more CSV files before importing.',
        }
      }

      const filePaths = input.selectionIds.map(getSelectedCsvFilePath)

      if (!filePaths.every(isString)) {
        return {
          ok: false,
          code: 'selected-csv-file-not-found',
          message: 'Selected CSV files are no longer available. Select them again before importing.',
        }
      }

      const files = filePaths.map((filePath) => ({ filePath }))

      return importCsvFiles({ database, files })
    },
  )

  ipcMain.handle(importIpcChannels.listBatches, (): ListImportBatchesResult => {
    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before viewing import history.',
      }
    }

    try {
      const importBatchesRepository = createImportBatchesRepository(database)

      return {
        ok: true,
        batches: importBatchesRepository.list().map(toImportBatchDto),
      }
    } catch {
      return {
        ok: false,
        code: 'import-batches-list-failed',
        message: 'Import history could not be loaded right now.',
      }
    }
  })

  ipcMain.handle(importIpcChannels.selectCsvFiles, async (event): Promise<SelectCsvFilesResult> => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: OpenDialogOptions = {
      title: 'Select CSV files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'CSV files', extensions: ['csv'] }],
    }
    const dialogResult = browserWindow
      ? await dialog.showOpenDialog(browserWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { ok: true, canceled: true, files: [] }
    }

    try {
      const files = await Promise.all(dialogResult.filePaths.map(getSelectedCsvFile))
      const selectedFiles = files.filter((file) => file !== null)

      if (selectedFiles.length !== dialogResult.filePaths.length) {
        return {
          ok: false,
          code: 'invalid-csv-file-selection',
          message: 'Only .csv files can be selected for import.',
        }
      }

      replaceSelectedCsvFilePaths(selectedFiles)

      return {
        ok: true,
        canceled: false,
        files: selectedFiles.map((file) => file.metadata),
      }
    } catch {
      return {
        ok: false,
        code: 'csv-file-selection-failed',
        message: 'CSV files could not be selected right now.',
      }
    }
  })
}
