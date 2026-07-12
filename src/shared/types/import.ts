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

export type ImportCsvFilesInput = {
  readonly selectionIds: readonly string[]
}

export type ManualCsvDateFormat = 'dd.mm.yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'

export type ManualCsvColumnMapping = {
  readonly amountColumn: string
  readonly currencyColumn?: string
  readonly dateColumn: string
  readonly dateFormat?: ManualCsvDateFormat
  readonly descriptionColumn: string
  readonly fixedCurrency?: string
}

export type CsvMappingProfileDto = {
  readonly createdAt: string
  readonly headerFingerprint: string
  readonly headers: readonly string[]
  readonly id: string
  readonly mapping: ManualCsvColumnMapping
  readonly name: string
  readonly updatedAt: string
}

export type SaveCsvMappingProfileInput = {
  readonly headers: readonly string[]
  readonly mapping: ManualCsvColumnMapping
  readonly name: string
}

export type FindCsvMappingProfilesInput = {
  readonly headers: readonly string[]
}

export type PreviewCsvFileInput = {
  readonly selectionId: string
}

export type ImportCsvFileWithMappingInput = {
  readonly mapping: ManualCsvColumnMapping
  readonly selectionId: string
}

export type ImportCsvFileSummaryDto = {
  readonly adapterId: string
  readonly diagnostics: readonly ImportDiagnosticDto[]
  readonly duplicateCount: number
  readonly failedCount: number
  readonly fileName: string
  readonly insertedCount: number
  readonly rowCount: number
}

export type ImportDiagnosticDto = {
  readonly code: string
  readonly columnName?: string
  readonly count: number
  readonly message: string
  readonly rowNumbers: readonly number[]
}

export type ImportCsvFilesResult =
  | {
      readonly ok: true
      readonly duplicateCount: number
      readonly failedCount: number
      readonly files: readonly ImportCsvFileSummaryDto[]
      readonly insertedCount: number
      readonly rowCount: number
    }
  | {
      readonly ok: false
      readonly code:
        | 'csv-import-failed'
        | 'invalid-csv-import-input'
        | 'project-not-open'
        | 'selected-csv-file-not-found'
      readonly message: string
    }

export type PreviewCsvColumnDto = {
  readonly header: string
  readonly nonEmptyCount: number
}

export type PreviewCsvFileResult =
  | {
      readonly ok: true
      readonly columns: readonly PreviewCsvColumnDto[]
      readonly detectedAdapterId: string | null
      readonly fileName: string
      readonly headers: readonly string[]
      readonly rowCount: number
    }
  | {
      readonly ok: false
      readonly code:
        | 'csv-preview-failed'
        | 'invalid-csv-preview-input'
        | 'selected-csv-file-not-found'
      readonly message: string
    }

export type ImportCsvFileWithMappingResult = ImportCsvFilesResult

export type SaveCsvMappingProfileResult =
  | {
      readonly ok: true
      readonly profile: CsvMappingProfileDto
    }
  | {
      readonly ok: false
      readonly code:
        | 'csv-mapping-profile-save-failed'
        | 'invalid-csv-mapping-profile-input'
        | 'project-not-open'
      readonly message: string
    }

export type FindCsvMappingProfilesResult =
  | {
      readonly ok: true
      readonly profiles: readonly CsvMappingProfileDto[]
    }
  | {
      readonly ok: false
      readonly code:
        | 'csv-mapping-profile-find-failed'
        | 'invalid-csv-mapping-profile-input'
        | 'project-not-open'
      readonly message: string
    }

export type ClearImportHistoryResult =
  | {
      readonly ok: true
      readonly clearedCount: number
    }
  | {
      readonly ok: false
      readonly code: 'clear-import-history-failed' | 'project-not-open'
      readonly message: string
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
