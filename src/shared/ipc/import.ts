import type { ListImportBatchesResult, SelectCsvFilesResult } from '../types/import.js'

export const importIpcChannels = {
  listBatches: 'import:listBatches',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  listBatches: () => Promise<ListImportBatchesResult>
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
