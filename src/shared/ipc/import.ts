import type { SelectCsvFilesResult } from '../types/import.js'

export const importIpcChannels = {
  selectCsvFiles: 'import:selectCsvFiles',
} as const

export type ImportApi = {
  selectCsvFiles: () => Promise<SelectCsvFilesResult>
}
