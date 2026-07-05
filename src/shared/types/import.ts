export type SelectedCsvFileMetadata = {
  readonly extension: string
  readonly fileName: string
  readonly selectionId: string
  readonly sizeBytes: number
}

export type SelectCsvFilesResult =
  | {
      readonly ok: true
      readonly canceled: false
      readonly files: readonly SelectedCsvFileMetadata[]
    }
  | {
      readonly ok: true
      readonly canceled: true
      readonly files: readonly []
    }
  | {
      readonly ok: false
      readonly code: 'csv-file-selection-failed' | 'invalid-csv-file-selection'
      readonly message: string
    }
