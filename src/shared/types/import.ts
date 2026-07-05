export type SelectedCsvFileMetadata = {
  readonly extension: string
  readonly fileName: string
  readonly selectionId: string
  readonly sizeBytes: number
}

export type ImportBatchDto = {
  readonly adapterId: string
  readonly duplicateCount: number
  readonly failedCount: number
  readonly id: string
  readonly importedAt: string
  readonly insertedCount: number
  readonly rowCount: number
  readonly sourceFileName: string
}

export type ListImportBatchesResult =
  | {
      readonly ok: true
      readonly batches: readonly ImportBatchDto[]
    }
  | {
      readonly ok: false
      readonly code: 'import-batches-list-failed' | 'project-not-open'
      readonly message: string
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
