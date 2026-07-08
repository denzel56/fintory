import type {
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ListImportBatchesResult,
  SelectCsvFilesResult,
} from '../types/import.js'

export const importIpcChannels = {
  importCsvFiles: 'import:importCsvFiles',
  listBatches: 'import:listBatches',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  importCsvFiles: (input: ImportCsvFilesInput) => Promise<ImportCsvFilesResult>
  listBatches: () => Promise<ListImportBatchesResult>
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
