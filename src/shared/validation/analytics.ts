import type { AnalyticsQuery, ValidatedAnalyticsQuery } from '../types/analytics.js'

type ValidationResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly code: 'invalid-analytics-query'; readonly message: string }

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const defaultLargestExpensesLimit = 10
const maxLargestExpensesLimit = 50

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isValidDateOnly = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const validateOptionalDate = (value: unknown): ValidationResult<string | null> => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null }
  }

  if (typeof value !== 'string' || !datePattern.test(value) || !isValidDateOnly(value)) {
    return {
      ok: false,
      code: 'invalid-analytics-query',
      message: 'Analytics date filters must use YYYY-MM-DD dates.',
    }
  }

  return { ok: true, value }
}

const validateOptionalLargestExpensesLimit = (value: unknown): ValidationResult<number> => {
  if (value === undefined || value === null) {
    return { ok: true, value: defaultLargestExpensesLimit }
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return {
      ok: false,
      code: 'invalid-analytics-query',
      message: 'Largest expenses limit must be a positive integer.',
    }
  }

  return { ok: true, value: Math.min(value, maxLargestExpensesLimit) }
}

export function validateAnalyticsQuery(input: unknown): ValidationResult<ValidatedAnalyticsQuery> {
  if (input !== undefined && !isRecord(input)) {
    return {
      ok: false,
      code: 'invalid-analytics-query',
      message: 'Analytics query is invalid.',
    }
  }

  const query: Partial<AnalyticsQuery> = input ?? {}
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
      code: 'invalid-analytics-query',
      message: 'Analytics start date must be before the end date.',
    }
  }

  const largestExpensesLimitResult = validateOptionalLargestExpensesLimit(
    query.largestExpensesLimit,
  )

  if (!largestExpensesLimitResult.ok) {
    return largestExpensesLimitResult
  }

  return {
    ok: true,
    value: {
      fromDate: fromDateResult.value,
      largestExpensesLimit: largestExpensesLimitResult.value,
      toDate: toDateResult.value,
    },
  }
}
