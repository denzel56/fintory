import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { importIpcChannels } from '../../shared/ipc/import.js'
import type {
  ClearImportHistoryResult,
  ImportCsvFileWithMappingInput,
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ImportBatchDto,
  ListImportBatchesResult,
  PreviewCsvFileInput,
  PreviewCsvFileResult,
  SelectCsvFilesResult,
  SelectedCsvFileMetadata,
} from '../../shared/types/import.js'
import { getActiveProjectDatabase } from '../db/project-database-connection.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { runInTransaction } from '../db/transactions.js'
import {
  importCsvFileWithMapping,
  importCsvFiles,
  previewCsvFile,
} from '../import/csv-import-service.js'

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

const isPreviewCsvFileInput = (input: unknown): input is PreviewCsvFileInput => {
  if (typeof input !== 'object' || input === null || !('selectionId' in input)) {
    return false
  }

  return typeof (input as { readonly selectionId: unknown }).selectionId === 'string'
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isImportCsvFileWithMappingInput = (
  input: unknown,
): input is ImportCsvFileWithMappingInput => {
  if (typeof input !== 'object' || input === null || !('selectionId' in input) || !('mapping' in input)) {
    return false
  }

  const candidate = input as {
    readonly mapping: unknown
    readonly selectionId: unknown
  }
  const mapping = candidate.mapping as
    | Partial<Record<keyof ImportCsvFileWithMappingInput['mapping'], unknown>>
    | null

  if (typeof mapping !== 'object' || mapping === null) {
    return false
  }

  const hasCurrencyFallback = isNonEmptyString(mapping.currencyColumn) || isNonEmptyString(mapping.fixedCurrency)

  return (
    isNonEmptyString(candidate.selectionId) &&
    isNonEmptyString(mapping.amountColumn) &&
    isNonEmptyString(mapping.dateColumn) &&
    isNonEmptyString(mapping.descriptionColumn) &&
    hasCurrencyFallback
  )
}

const isString = (value: string | undefined): value is string => typeof value === 'string'

export function registerImportIpcHandlers(): void {
  ipcMain.handle(importIpcChannels.clearHistory, (): ClearImportHistoryResult => {
    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before clearing import history.',
      }
    }

    try {
      const importBatchesRepository = createImportBatchesRepository(database)
      const clearedCount = runInTransaction(database, () => importBatchesRepository.clear())

      return { ok: true, clearedCount }
    } catch {
      return {
        ok: false,
        code: 'clear-import-history-failed',
        message: 'Import history could not be cleared right now.',
      }
    }
  })

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

  ipcMain.handle(
    importIpcChannels.importCsvFileWithMapping,
    async (_event, input: unknown): Promise<ImportCsvFilesResult> => {
      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before importing CSV files.',
        }
      }

      if (!isImportCsvFileWithMappingInput(input)) {
        return {
          ok: false,
          code: 'invalid-csv-import-input',
          message: 'Map date, description, amount, and currency before importing.',
        }
      }

      const filePath = getSelectedCsvFilePath(input.selectionId)

      if (!filePath) {
        return {
          ok: false,
          code: 'selected-csv-file-not-found',
          message: 'Selected CSV file is no longer available. Select it again before importing.',
        }
      }

      return importCsvFileWithMapping({ database, filePath, mapping: input.mapping })
    },
  )

  ipcMain.handle(
    importIpcChannels.previewCsvFile,
    async (_event, input: unknown): Promise<PreviewCsvFileResult> => {
      if (!isPreviewCsvFileInput(input)) {
        return {
          ok: false,
          code: 'invalid-csv-preview-input',
          message: 'Select one CSV file before previewing its columns.',
        }
      }

      const filePath = getSelectedCsvFilePath(input.selectionId)

      if (!filePath) {
        return {
          ok: false,
          code: 'selected-csv-file-not-found',
          message: 'Selected CSV file is no longer available. Select it again before previewing.',
        }
      }

      return previewCsvFile({ filePath })
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
