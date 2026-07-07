import type { CsvParseResult, ParsedCsvRow } from '../csv-parser.js'
import type { TransactionDirection, TransactionDraft } from '../transaction-draft.js'
import type {
  CsvImportAdapter,
  CsvImportAdapterError,
  CsvImportAdapterResult,
  CsvRowNormalizer,
} from './csv-import-adapter.js'

const adapterId = 'generic-signed-amount-v1'
const requiredColumns = ['date', 'description', 'amount', 'currency'] as const

type HeaderLookup = ReadonlyMap<string, string>

const normalizeColumnName = (columnName: string): string => columnName.trim().toLowerCase()

const getHeaderLookup = (headers: readonly string[]): HeaderLookup => {
  const lookup = new Map<string, string>()

  for (const header of headers) {
    lookup.set(normalizeColumnName(header), header)
  }

  return lookup
}

const getMissingRequiredColumnErrors = (headers: readonly string[]): readonly CsvImportAdapterError[] => {
  const headerLookup = getHeaderLookup(headers)

  return requiredColumns.flatMap((columnName) => {
    if (headerLookup.has(columnName)) {
      return []
    }

    return [
      {
        code: 'missing-required-column',
        columnName,
        message: `CSV is missing the required ${columnName} column.`,
      } satisfies CsvImportAdapterError,
    ]
  })
}

const getRequiredValue = (
  row: ParsedCsvRow,
  headerLookup: HeaderLookup,
  columnName: (typeof requiredColumns)[number],
): string => {
  const header = headerLookup.get(columnName)

  return header ? (row.values[header] ?? '').trim() : ''
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
  const fractionText = (match.groups.fraction ?? '').padEnd(2, '0')
  const fraction = Number(fractionText)
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

const normalizeCurrency = (currencyText: string): string | null => {
  const currency = currencyText.trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : null
}

const createGenericRowNormalizer = (headers: readonly string[]): CsvRowNormalizer => {
  const headerLookup = getHeaderLookup(headers)

  return (row) => {
    const dateText = getRequiredValue(row, headerLookup, 'date')
    const description = getRequiredValue(row, headerLookup, 'description')
    const amountText = getRequiredValue(row, headerLookup, 'amount')
    const currencyText = getRequiredValue(row, headerLookup, 'currency')
    const errors: CsvImportAdapterError[] = []

    if (!dateText) {
      errors.push(
        createRowError('missing-required-value', row.rowNumber, 'date', 'Transaction date is required.'),
      )
    } else if (!isValidIsoDate(dateText)) {
      errors.push(
        createRowError(
          'invalid-date',
          row.rowNumber,
          'date',
          'Transaction date must use YYYY-MM-DD format.',
        ),
      )
    }

    if (!description) {
      errors.push(
        createRowError(
          'missing-required-value',
          row.rowNumber,
          'description',
          'Transaction description is required.',
        ),
      )
    }

    const amountResult = parseSignedAmountMinor(amountText)
    if (!amountText) {
      errors.push(
        createRowError('missing-required-value', row.rowNumber, 'amount', 'Transaction amount is required.'),
      )
    } else if (!amountResult.ok) {
      errors.push(
        createRowError(
          'invalid-amount',
          row.rowNumber,
          'amount',
          'Transaction amount must be a non-zero decimal value with up to two fraction digits.',
        ),
      )
    }

    const currency = normalizeCurrency(currencyText)
    if (!currencyText) {
      errors.push(
        createRowError(
          'missing-required-value',
          row.rowNumber,
          'currency',
          'Transaction currency is required.',
        ),
      )
    } else if (!currency) {
      errors.push(
        createRowError(
          'invalid-currency',
          row.rowNumber,
          'currency',
          'Transaction currency must be a three-letter ISO code.',
        ),
      )
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
}

export const genericCsvImportAdapter: CsvImportAdapter = {
  displayName: 'Generic signed amount CSV',
  id: adapterId,
  requiredColumns,
  canHandle: (headers) => getMissingRequiredColumnErrors(headers).length === 0,
  normalizeRows: (parseResult: CsvParseResult): CsvImportAdapterResult => {
    const missingRequiredColumnErrors = getMissingRequiredColumnErrors(parseResult.headers)

    if (missingRequiredColumnErrors.length > 0) {
      return {
        adapterId,
        drafts: [],
        errors: missingRequiredColumnErrors,
      }
    }

    const normalizeRow = createGenericRowNormalizer(parseResult.headers)
    const drafts: TransactionDraft[] = []
    const errors: CsvImportAdapterError[] = []

    for (const row of parseResult.rows) {
      const result = normalizeRow(row)

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
  },
}
