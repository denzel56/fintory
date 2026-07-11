import type {
  ClearImportHistoryResult,
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ListImportBatchesResult,
  SelectCsvFilesResult,
} from '../types/import.js'

export const importIpcChannels = {
  clearHistory: 'import:clearHistory',
  importCsvFiles: 'import:importCsvFiles',
  listBatches: 'import:listBatches',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  clearHistory: () => Promise<ClearImportHistoryResult>
  importCsvFiles: (input: ImportCsvFilesInput) => Promise<ImportCsvFilesResult>
  listBatches: () => Promise<ListImportBatchesResult>
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
