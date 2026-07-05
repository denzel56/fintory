import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { importIpcChannels } from '../../shared/ipc/import.js'
import type {
  SelectCsvFilesResult,
  SelectedCsvFileMetadata,
} from '../../shared/types/import.js'

const selectedCsvFilePathsById = new Map<string, string>()

const getSafeCsvMetadata = async (
  filePath: string,
): Promise<SelectedCsvFileMetadata | null> => {
  const extension = extname(filePath).toLowerCase()

  if (extension !== '.csv') {
    return null
  }

  const fileStats = await stat(filePath)
  const selectionId = randomUUID()

  selectedCsvFilePathsById.set(selectionId, filePath)

  return {
    extension,
    fileName: basename(filePath),
    selectionId,
    sizeBytes: fileStats.size,
  }
}

export const getSelectedCsvFilePath = (selectionId: string): string | undefined =>
  selectedCsvFilePathsById.get(selectionId)

export function registerImportIpcHandlers(): void {
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
      const files = await Promise.all(dialogResult.filePaths.map(getSafeCsvMetadata))
      const selectedFiles = files.filter((file) => file !== null)

      if (selectedFiles.length !== dialogResult.filePaths.length) {
        return {
          ok: false,
          code: 'invalid-csv-file-selection',
          message: 'Only .csv files can be selected for import.',
        }
      }

      return { ok: true, canceled: false, files: selectedFiles }
    } catch {
      return {
        ok: false,
        code: 'csv-file-selection-failed',
        message: 'CSV files could not be selected right now.',
      }
    }
  })
}
