import type { CsvParseResult, ParsedCsvRow } from '../csv-parser.js'
import type { TransactionDraft } from '../transaction-draft.js'

export type CsvImportAdapterErrorCode =
  | 'invalid-amount'
  | 'invalid-currency'
  | 'invalid-date'
  | 'missing-required-column'
  | 'missing-required-value'
  | 'unsupported-column-set'

export type CsvImportAdapterError = {
  readonly code: CsvImportAdapterErrorCode
  readonly columnName?: string
  readonly message: string
  readonly rowNumber?: number
}

export type CsvImportAdapterResult = {
  readonly adapterId: string
  readonly drafts: readonly TransactionDraft[]
  readonly errors: readonly CsvImportAdapterError[]
}

export type CsvImportAdapter = {
  readonly displayName: string
  readonly id: string
  readonly requiredColumns: readonly string[]
  readonly canHandle: (headers: readonly string[]) => boolean
  readonly normalizeRows: (parseResult: CsvParseResult) => CsvImportAdapterResult
}

export type CsvRowNormalizer = (row: ParsedCsvRow) =>
  | {
      readonly ok: true
      readonly draft: TransactionDraft
    }
  | {
      readonly ok: false
      readonly errors: readonly CsvImportAdapterError[]
    }
