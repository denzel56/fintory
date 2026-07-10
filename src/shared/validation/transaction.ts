import type {
  ListTransactionsQuery,
  TransactionDirection,
  TransactionSortDirection,
  TransactionSortField,
  ValidatedListTransactionsQuery,
} from '../types/transaction.js'

type ValidationResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly code: 'invalid-transactions-query'; readonly message: string }

const defaultPage = 1
const defaultPageSize = 50
const maxPageSize = 100
const searchMaxLength = 120
const categoryIdMaxLength = 120
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const sortFields = new Set<TransactionSortField>(['amount', 'date', 'description'])
const sortDirections = new Set<TransactionSortDirection>(['asc', 'desc'])
const transactionDirections = new Set<TransactionDirection>(['expense', 'income'])

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return fallback
  }

  return value
}

const validateOptionalDate = (value: unknown): ValidationResult<string | null> => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null }
  }

  if (typeof value !== 'string' || !datePattern.test(value)) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction date filters must use YYYY-MM-DD dates.',
    }
  }

  return { ok: true, value }
}

const validateOptionalSearch = (value: unknown): ValidationResult<string | null> => {
  if (value === undefined || value === null) {
    return { ok: true, value: null }
  }

  if (typeof value !== 'string') {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction search must be text.',
    }
  }

  const trimmedSearch = value.trim()

  if (trimmedSearch.length === 0) {
    return { ok: true, value: null }
  }

  if (trimmedSearch.length > searchMaxLength) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: `Transaction search must be ${searchMaxLength} characters or less.`,
    }
  }

  return { ok: true, value: trimmedSearch }
}

const validateOptionalCategoryId = (value: unknown): ValidationResult<string | null> => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null }
  }

  if (typeof value !== 'string') {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction category filter is invalid.',
    }
  }

  const trimmedCategoryId = value.trim()

  if (trimmedCategoryId.length === 0 || trimmedCategoryId.length > categoryIdMaxLength) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction category filter is invalid.',
    }
  }

  return { ok: true, value: trimmedCategoryId }
}

const validateOptionalDirection = (value: unknown): ValidationResult<TransactionDirection | null> => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null }
  }

  if (typeof value !== 'string' || !transactionDirections.has(value as TransactionDirection)) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction direction filter is invalid.',
    }
  }

  return { ok: true, value: value as TransactionDirection }
}

export function validateListTransactionsQuery(
  input: unknown,
): ValidationResult<ValidatedListTransactionsQuery> {
  if (input !== undefined && !isRecord(input)) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction query is invalid.',
    }
  }

  const query: Partial<ListTransactionsQuery> = input ?? {}
  const page = getPositiveInteger(query.page, defaultPage)
  const pageSize = Math.min(getPositiveInteger(query.pageSize, defaultPageSize), maxPageSize)
  const sortField = typeof query.sortField === 'string' ? query.sortField : 'date'
  const sortDirection = typeof query.sortDirection === 'string' ? query.sortDirection : 'desc'

  if (!sortFields.has(sortField as TransactionSortField)) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction sort field is invalid.',
    }
  }

  if (!sortDirections.has(sortDirection as TransactionSortDirection)) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction sort direction is invalid.',
    }
  }

  const searchResult = validateOptionalSearch(query.search)

  if (!searchResult.ok) {
    return searchResult
  }

  const fromDateResult = validateOptionalDate(query.fromDate)

  if (!fromDateResult.ok) {
    return fromDateResult
  }

  const toDateResult = validateOptionalDate(query.toDate)

  if (!toDateResult.ok) {
    return toDateResult
  }

  if (fromDateResult.value && toDateResult.value && fromDateResult.value > toDateResult.value) {
    return {
      ok: false,
      code: 'invalid-transactions-query',
      message: 'Transaction start date must be before the end date.',
    }
  }

  const categoryIdResult = validateOptionalCategoryId(query.categoryId)

  if (!categoryIdResult.ok) {
    return categoryIdResult
  }

  const directionResult = validateOptionalDirection(query.direction)

  if (!directionResult.ok) {
    return directionResult
  }

  return {
    ok: true,
    value: {
      categoryId: categoryIdResult.value,
      direction: directionResult.value,
      fromDate: fromDateResult.value,
      page,
      pageSize,
      search: searchResult.value,
      sortDirection: sortDirection as TransactionSortDirection,
      sortField: sortField as TransactionSortField,
      toDate: toDateResult.value,
    },
  }
}
