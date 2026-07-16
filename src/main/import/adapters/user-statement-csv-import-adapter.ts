import type { CsvParseError, CsvParseResult, ParsedCsvRow } from '../csv-parser.js'
import type { TransactionDirection, TransactionDraft } from '../transaction-draft.js'
import type {
  CsvImportAdapter,
  CsvImportAdapterError,
  CsvImportAdapterResult,
  CsvRowNormalizer,
} from './csv-import-adapter.js'

const adapterId = 'user-statement-csv-v1'
const requiredColumns = [
  'operationDate',
  'transactionDate',
  'accountName',
  'accountNumber',
  'cardName',
  'cardNumber',
  'merchant',
  'amount',
  'currency',
  'status',
  'category',
  'mcc',
  'type',
  'comment',
  'bonusValue',
  'bonusTitle',
] as const

const normalizeColumnName = (columnName: string): string => columnName.trim().toLowerCase()

const getHeaderLookup = (headers: readonly string[]): ReadonlyMap<string, string> => {
  const lookup = new Map<string, string>()

  for (const header of headers) {
    lookup.set(normalizeColumnName(header), header)
  }

  return lookup
}

const getHeaderColumnErrors = (headers: readonly string[]): readonly CsvImportAdapterError[] => {
  const headerLookup = getHeaderLookup(headers)

  return requiredColumns
    .filter((columnName) => !headerLookup.has(normalizeColumnName(columnName)))
    .map((columnName) => ({
      code: 'missing-required-column',
      columnName,
      message: `CSV is missing the required ${columnName} column.`,
    }))
}

const mapParseError = (error: CsvParseError): CsvImportAdapterError => ({
  code: error.rowNumber === 1 ? 'malformed-csv-header' : 'malformed-csv-row',
  message: error.message,
  rowNumber: error.rowNumber,
})

const getValue = (
  row: ParsedCsvRow,
  headerLookup: ReadonlyMap<string, string>,
  columnName: (typeof requiredColumns)[number],
): string => {
  const header = headerLookup.get(normalizeColumnName(columnName))

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

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const parseStatementDate = (dateText: string): string | null => {
  const match = /^(?<day>\d{1,2})\.(?<month>\d{1,2})\.(?<year>\d{4})$/.exec(dateText.trim())

  if (!match?.groups) {
    return null
  }

  const year = Number(match.groups.year)
  const month = Number(match.groups.month)
  const day = Number(match.groups.day)

  if (!isValidDateParts(year, month, day)) {
    return null
  }

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

const parseAmountMinor = (amountText: string): number | null => {
  const normalizedAmount = amountText.trim().replace(',', '.')
  const match = /^(?<units>\d+)(?:\.(?<fraction>\d{1,2}))?$/.exec(normalizedAmount)

  if (!match?.groups) {
    return null
  }

  const units = Number(match.groups.units)
  const fraction = Number((match.groups.fraction ?? '').padEnd(2, '0'))
  const amountMinor = units * 100 + fraction

  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null
}

const normalizeCurrency = (currencyText: string): string | null => {
  const currency = currencyText.trim().toUpperCase()

  if (currency === 'RUR') {
    return 'RUB'
  }

  return /^[A-Z]{3}$/.test(currency) ? currency : null
}

const getDirection = (typeText: string): TransactionDirection | null => {
  const type = typeText.trim()

  if (type === 'Списание') {
    return 'expense'
  }

  if (type === 'Пополнение') {
    return 'income'
  }

  return null
}

const createStatementRowNormalizer = (headers: readonly string[]): CsvRowNormalizer => {
  const headerLookup = getHeaderLookup(headers)

  return (row) => {
    const transactionDateText = getValue(row, headerLookup, 'transactionDate')
    const merchant = getValue(row, headerLookup, 'merchant')
    const amountText = getValue(row, headerLookup, 'amount')
    const currencyText = getValue(row, headerLookup, 'currency')
    const statusText = getValue(row, headerLookup, 'status')
    const typeText = getValue(row, headerLookup, 'type')
    const errors: CsvImportAdapterError[] = []

    const transactionDate = parseStatementDate(transactionDateText)
    if (!transactionDateText) {
      errors.push(createRowError('missing-required-value', row.rowNumber, 'transactionDate', 'Transaction date is required.'))
    } else if (!transactionDate) {
      errors.push(createRowError('invalid-date', row.rowNumber, 'transactionDate', 'Transaction date must use DD.MM.YYYY format.'))
    }

    if (!merchant) {
      errors.push(createRowError('missing-required-value', row.rowNumber, 'merchant', 'Transaction merchant is required.'))
    }

    const amountMinor = parseAmountMinor(amountText)
    if (!amountText) {
      errors.push(createRowError('missing-required-value', row.rowNumber, 'amount', 'Transaction amount is required.'))
    } else if (!amountMinor) {
      errors.push(createRowError('invalid-amount', row.rowNumber, 'amount', 'Transaction amount must be a positive decimal value.'))
    }

    const currency = normalizeCurrency(currencyText)
    if (!currencyText) {
      errors.push(createRowError('missing-required-value', row.rowNumber, 'currency', 'Transaction currency is required.'))
    } else if (!currency) {
      errors.push(createRowError('invalid-currency', row.rowNumber, 'currency', 'Transaction currency must be a three-letter ISO code.'))
    }

    if (statusText && statusText !== 'Выполнен') {
      errors.push(createRowError('unsupported-transaction-status', row.rowNumber, 'status', 'Transaction status is not supported by this adapter.'))
    }

    const direction = getDirection(typeText)
    if (!typeText) {
      errors.push(createRowError('missing-required-value', row.rowNumber, 'type', 'Transaction type is required.'))
    } else if (!direction) {
      errors.push(createRowError('unsupported-transaction-type', row.rowNumber, 'type', 'Transaction type is not supported by this adapter.'))
    }

    if (errors.length > 0 || !amountMinor || !currency || !direction || !transactionDate) {
      return { ok: false, errors }
    }

    return {
      ok: true,
      draft: {
        amountMinor,
        currency,
        description: merchant,
        direction,
        merchant,
        rawDescription: merchant,
        rowNumber: row.rowNumber,
        transactionDate,
      },
    }
  }
}

export const userStatementCsvImportAdapter: CsvImportAdapter = {
  displayName: 'User statement CSV',
  id: adapterId,
  requiredColumns,
  canHandle: (headers) => getHeaderColumnErrors(headers).length === 0,
  normalizeRows: (parseResult: CsvParseResult): CsvImportAdapterResult => {
    const parseErrors = parseResult.errors.map(mapParseError)
    const headerErrors = parseErrors.filter((error) => error.code === 'malformed-csv-header')
    const headerColumnErrors = getHeaderColumnErrors(parseResult.headers)

    if (headerErrors.length > 0 || headerColumnErrors.length > 0) {
      return {
        adapterId,
        drafts: [],
        errors: [...parseErrors, ...headerColumnErrors],
      }
    }

    const normalizeRow = createStatementRowNormalizer(parseResult.headers)
    const drafts: TransactionDraft[] = []
    const errors: CsvImportAdapterError[] = parseErrors

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
