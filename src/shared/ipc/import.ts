import type {
  ClearImportHistoryResult,
  FindCsvMappingProfilesInput,
  FindCsvMappingProfilesResult,
  ImportCsvFileWithMappingInput,
  ImportCsvFileWithMappingResult,
  ImportCsvFilesInput,
  ImportCsvFilesResult,
  ListImportBatchesResult,
  PreviewCsvFileInput,
  PreviewCsvFileResult,
  SaveCsvMappingProfileInput,
  SaveCsvMappingProfileResult,
  SelectCsvFilesResult,
} from '../types/import.js'

export const importIpcChannels = {
  clearHistory: 'import:clearHistory',
  findCsvMappingProfiles: 'import:findCsvMappingProfiles',
  importCsvFileWithMapping: 'import:importCsvFileWithMapping',
  importCsvFiles: 'import:importCsvFiles',
  listBatches: 'import:listBatches',
  previewCsvFile: 'import:previewCsvFile',
  saveCsvMappingProfile: 'import:saveCsvMappingProfile',
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  clearHistory: () => Promise<ClearImportHistoryResult>
  findCsvMappingProfiles: (
    input: FindCsvMappingProfilesInput,
  ) => Promise<FindCsvMappingProfilesResult>
  importCsvFileWithMapping: (
    input: ImportCsvFileWithMappingInput,
  ) => Promise<ImportCsvFileWithMappingResult>
  importCsvFiles: (input: ImportCsvFilesInput) => Promise<ImportCsvFilesResult>
  listBatches: () => Promise<ListImportBatchesResult>
  previewCsvFile: (input: PreviewCsvFileInput) => Promise<PreviewCsvFileResult>
  saveCsvMappingProfile: (
    input: SaveCsvMappingProfileInput,
  ) => Promise<SaveCsvMappingProfileResult>
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
