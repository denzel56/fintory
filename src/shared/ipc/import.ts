import type {
  ClearImportHistoryResult,
  ImportCsvFileWithMappingInput,
  ImportCsvFileWithMappingResult,
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ListImportBatchesResult,
  PreviewCsvFileInput,
  PreviewCsvFileResult,
  SelectCsvFilesResult,
} from '../types/import.js'

export const importIpcChannels = {
  clearHistory: 'import:clearHistory',
  importCsvFileWithMapping: 'import:importCsvFileWithMapping',
  importCsvFiles: 'import:importCsvFiles',
  listBatches: 'import:listBatches',
  previewCsvFile: 'import:previewCsvFile',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  clearHistory: () => Promise<ClearImportHistoryResult>
  importCsvFileWithMapping: (
    input: ImportCsvFileWithMappingInput,
  ) => Promise<ImportCsvFileWithMappingResult>
  importCsvFiles: (input: ImportCsvFilesInput) => Promise<ImportCsvFilesResult>
  listBatches: () => Promise<ListImportBatchesResult>
  previewCsvFile: (input: PreviewCsvFileInput) => Promise<PreviewCsvFileResult>
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
