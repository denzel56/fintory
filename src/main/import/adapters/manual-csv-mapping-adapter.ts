import type { ManualCsvColumnMapping } from '../../../shared/types/import.js'
import type { CsvParseError, CsvParseResult, ParsedCsvRow } from '../csv-parser.js'
import type { TransactionDirection, TransactionDraft } from '../transaction-draft.js'
import type { CsvImportAdapterError, CsvImportAdapterResult } from './csv-import-adapter.js'

const adapterId = 'manual-signed-amount-v1'

const normalizeColumnName = (columnName: string): string => columnName.trim().toLowerCase()

const normalizeCurrency = (currencyText: string): string | null => {
  const currency = currencyText.trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : null
}

const isValidIsoDate = (dateText: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return false
  }

  const [yearText, monthText, dayText] = dateText.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const parseSignedAmountMinor = (
  amountText: string,
):
  | { readonly ok: true; readonly amountMinor: number; readonly direction: TransactionDirection }
  | { readonly ok: false } => {
  const normalizedAmount = amountText.trim().replace(',', '.')
  const match = /^(?<sign>-?)(?<units>\d+)(?:\.(?<fraction>\d{1,2}))?$/.exec(normalizedAmount)

  if (!match?.groups) {
    return { ok: false }
  }

  const units = Number(match.groups.units)
  const fraction = Number((match.groups.fraction ?? '').padEnd(2, '0'))
  const unsignedMinor = units * 100 + fraction

  if (!Number.isSafeInteger(unsignedMinor) || unsignedMinor === 0) {
    return { ok: false }
  }

  return {
    ok: true,
    amountMinor: unsignedMinor,
    direction: match.groups.sign === '-' ? 'expense' : 'income',
  }
}

const createRowError = (
  code: CsvImportAdapterError['code'],
  rowNumber: number,
  columnName: string,
  message: string,
): CsvImportAdapterError => ({
  code,
  columnName,
  message,
  rowNumber,
})

const mapParseError = (error: CsvParseError): CsvImportAdapterError => ({
  code: error.rowNumber === 1 ? 'malformed-csv-header' : 'malformed-csv-row',
  message: error.message,
  rowNumber: error.rowNumber,
})

const getMappedValue = (row: ParsedCsvRow, columnName: string): string => {
  return (row.values[columnName] ?? '').trim()
}

const getHeaderErrors = (
  headers: readonly string[],
  mapping: ManualCsvColumnMapping,
): readonly CsvImportAdapterError[] => {
  const normalizedHeaders = new Set(headers.map(normalizeColumnName))
  const requiredColumns = [mapping.dateColumn, mapping.descriptionColumn, mapping.amountColumn]
  const maybeCurrencyColumn = mapping.currencyColumn?.trim()

  return [...requiredColumns, maybeCurrencyColumn]
    .filter((columnName): columnName is string => typeof columnName === 'string' && columnName.length > 0)
    .filter((columnName) => !normalizedHeaders.has(normalizeColumnName(columnName)))
    .map((columnName) => ({
      code: 'missing-required-column',
      columnName,
      message: `CSV is missing the mapped ${columnName} column.`,
    }))
}

const normalizeRow = (
  row: ParsedCsvRow,
  mapping: ManualCsvColumnMapping,
):
  | { readonly ok: true; readonly draft: TransactionDraft }
  | { readonly ok: false; readonly errors: readonly CsvImportAdapterError[] } => {
  const dateText = getMappedValue(row, mapping.dateColumn)
  const description = getMappedValue(row, mapping.descriptionColumn)
  const amountText = getMappedValue(row, mapping.amountColumn)
  const currencyText = mapping.currencyColumn
    ? getMappedValue(row, mapping.currencyColumn)
    : (mapping.fixedCurrency ?? '')
  const errors: CsvImportAdapterError[] = []

  if (!dateText) {
    errors.push(createRowError('missing-required-value', row.rowNumber, mapping.dateColumn, 'Transaction date is required.'))
  } else if (!isValidIsoDate(dateText)) {
    errors.push(createRowError('invalid-date', row.rowNumber, mapping.dateColumn, 'Transaction date must use YYYY-MM-DD format.'))
  }

  if (!description) {
    errors.push(
      createRowError('missing-required-value', row.rowNumber, mapping.descriptionColumn, 'Transaction description is required.'),
    )
  }

  const amountResult = parseSignedAmountMinor(amountText)
  if (!amountText) {
    errors.push(createRowError('missing-required-value', row.rowNumber, mapping.amountColumn, 'Transaction amount is required.'))
  } else if (!amountResult.ok) {
    errors.push(
      createRowError(
        'invalid-amount',
        row.rowNumber,
        mapping.amountColumn,
        'Transaction amount must be a signed non-zero decimal value with up to two fraction digits.',
      ),
    )
  }

  const currency = normalizeCurrency(currencyText)
  if (!currencyText) {
    errors.push(createRowError('missing-required-value', row.rowNumber, mapping.currencyColumn ?? 'fixedCurrency', 'Transaction currency is required.'))
  } else if (!currency) {
    errors.push(createRowError('invalid-currency', row.rowNumber, mapping.currencyColumn ?? 'fixedCurrency', 'Transaction currency must be a three-letter ISO code.'))
  }

  if (errors.length > 0 || !amountResult.ok || !currency) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    draft: {
      amountMinor: amountResult.amountMinor,
      currency,
      description,
      direction: amountResult.direction,
      merchant: null,
      rawDescription: description,
      rowNumber: row.rowNumber,
      transactionDate: dateText,
    },
  }
}

export const normalizeRowsWithManualMapping = (
  parseResult: CsvParseResult,
  mapping: ManualCsvColumnMapping,
): CsvImportAdapterResult => {
  const parseErrors = parseResult.errors.map(mapParseError)
  const headerErrors = getHeaderErrors(parseResult.headers, mapping)

  if (headerErrors.length > 0) {
    return {
      adapterId,
      drafts: [],
      errors: [...parseErrors, ...headerErrors],
    }
  }

  const drafts: TransactionDraft[] = []
  const errors: CsvImportAdapterError[] = [...parseErrors]

  for (const row of parseResult.rows) {
    const result = normalizeRow(row, mapping)

    if (result.ok) {
      drafts.push(result.draft)
    } else {
      errors.push(...result.errors)
    }
  }

  return {
    adapterId,
    drafts,
    errors,
  }
}

export const manualCsvMappingAdapterId = adapterId
