import type { DatabaseSync } from 'node:sqlite'
import type {
  AnalyticsCategoryExpenseDto,
  AnalyticsCurrencySummaryDto,
  AnalyticsDashboardDto,
  AnalyticsLargestExpenseDto,
  AnalyticsMonthlyAmountDto,
  AnalyticsPeriodSummaryDto,
  ValidatedAnalyticsQuery,
} from '../../../shared/types/analytics.js'

type SqlParameter = number | string

type SummaryRow = {
  readonly amount_minor: number
  readonly currency: string
  readonly direction: 'expense' | 'income'
  readonly transaction_count: number
}

type TotalCountRow = {
  readonly transaction_count: number
}

type MonthlyAmountRow = {
  readonly amount_minor: number
  readonly currency: string
  readonly month: string
  readonly transaction_count: number
}

type CategoryExpenseRow = {
  readonly amount_minor: number
  readonly category_color: string | null
  readonly category_id: string | null
  readonly category_name: string | null
  readonly currency: string
  readonly transaction_count: number
}

type LargestExpenseRow = {
  readonly amount_minor: number
  readonly category_color: string | null
  readonly category_id: string | null
  readonly category_name: string | null
  readonly currency: string
  readonly description: string
  readonly id: string
  readonly merchant: string | null
  readonly transaction_date: string
}

export type AnalyticsRepository = {
  readonly getDashboard: (query: ValidatedAnalyticsQuery) => AnalyticsDashboardDto
  readonly getExpensesByCategory: (
    query: ValidatedAnalyticsQuery,
  ) => readonly AnalyticsCategoryExpenseDto[]
  readonly getExpensesByMonth: (query: ValidatedAnalyticsQuery) => readonly AnalyticsMonthlyAmountDto[]
  readonly getIncomeByMonth: (query: ValidatedAnalyticsQuery) => readonly AnalyticsMonthlyAmountDto[]
  readonly getLargestExpenses: (query: ValidatedAnalyticsQuery) => readonly AnalyticsLargestExpenseDto[]
  readonly getPeriodSummary: (query: ValidatedAnalyticsQuery) => AnalyticsPeriodSummaryDto
}

const buildDateFilter = (
  query: ValidatedAnalyticsQuery,
): { readonly parameters: readonly SqlParameter[]; readonly whereSql: string } => {
  const parameters: SqlParameter[] = []
  const whereClauses: string[] = []

  if (query.fromDate) {
    whereClauses.push('transactions.transaction_date >= ?')
    parameters.push(query.fromDate)
  }

  if (query.toDate) {
    whereClauses.push('transactions.transaction_date <= ?')
    parameters.push(query.toDate)
  }

  return {
    parameters,
    whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
  }
}

const buildDirectionalDateFilter = (
  query: ValidatedAnalyticsQuery,
  direction: 'expense' | 'income',
): { readonly parameters: readonly SqlParameter[]; readonly whereSql: string } => {
  const parameters: SqlParameter[] = [direction]
  const whereClauses = ['transactions.direction = ?']

  if (query.fromDate) {
    whereClauses.push('transactions.transaction_date >= ?')
    parameters.push(query.fromDate)
  }

  if (query.toDate) {
    whereClauses.push('transactions.transaction_date <= ?')
    parameters.push(query.toDate)
  }

  return {
    parameters,
    whereSql: `WHERE ${whereClauses.join(' AND ')}`,
  }
}

const toCategory = (row: {
  readonly category_color: string | null
  readonly category_id: string | null
  readonly category_name: string | null
}): AnalyticsCategoryExpenseDto['category'] => {
  if (!row.category_id || !row.category_name || !row.category_color) {
    return null
  }

  return {
    color: row.category_color,
    id: row.category_id,
    name: row.category_name,
  }
}

const toMonthlyAmountDto = (row: MonthlyAmountRow): AnalyticsMonthlyAmountDto => ({
  amountMinor: row.amount_minor,
  currency: row.currency,
  month: row.month,
  transactionCount: row.transaction_count,
})

const toCategoryExpenseDto = (row: CategoryExpenseRow): AnalyticsCategoryExpenseDto => ({
  amountMinor: row.amount_minor,
  category: toCategory(row),
  currency: row.currency,
  transactionCount: row.transaction_count,
})

const toLargestExpenseDto = (row: LargestExpenseRow): AnalyticsLargestExpenseDto => ({
  amountMinor: row.amount_minor,
  category: toCategory(row),
  currency: row.currency,
  description: row.description,
  id: row.id,
  merchant: row.merchant,
  transactionDate: row.transaction_date,
})

const toPeriodSummary = (
  rows: readonly SummaryRow[],
  transactionCount: number,
): AnalyticsPeriodSummaryDto => {
  const summaryByCurrency = new Map<string, AnalyticsCurrencySummaryDto>()

  for (const row of rows) {
    const current = summaryByCurrency.get(row.currency) ?? {
      currency: row.currency,
      expenseCount: 0,
      expenseTotalMinor: 0,
      incomeCount: 0,
      incomeTotalMinor: 0,
      netTotalMinor: 0,
    }

    const nextSummary =
      row.direction === 'expense'
        ? {
            ...current,
            expenseCount: row.transaction_count,
            expenseTotalMinor: row.amount_minor,
            netTotalMinor: current.incomeTotalMinor - row.amount_minor,
          }
        : {
            ...current,
            incomeCount: row.transaction_count,
            incomeTotalMinor: row.amount_minor,
            netTotalMinor: row.amount_minor - current.expenseTotalMinor,
          }

    summaryByCurrency.set(row.currency, nextSummary)
  }

  return {
    totalsByCurrency: [...summaryByCurrency.values()].sort((left, right) =>
      left.currency.localeCompare(right.currency),
    ),
    transactionCount,
  }
}

export function createAnalyticsRepository(database: DatabaseSync): AnalyticsRepository {
  const getPeriodSummary = (query: ValidatedAnalyticsQuery): AnalyticsPeriodSummaryDto => {
    const { parameters, whereSql } = buildDateFilter(query)
    const totalCountRow = database
      .prepare(`SELECT COUNT(*) AS transaction_count FROM transactions ${whereSql}`)
      .get(...parameters) as TotalCountRow | undefined
    const rows = database
      .prepare(
        `SELECT
          currency,
          direction,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(amount_minor), 0) AS amount_minor
        FROM transactions
        ${whereSql}
        GROUP BY currency, direction
        ORDER BY currency ASC, direction ASC`,
      )
      .all(...parameters) as SummaryRow[]

    return toPeriodSummary(rows, totalCountRow?.transaction_count ?? 0)
  }

  const getMonthlyAmounts = (
    query: ValidatedAnalyticsQuery,
    direction: 'expense' | 'income',
  ): readonly AnalyticsMonthlyAmountDto[] => {
    const { parameters, whereSql } = buildDirectionalDateFilter(query, direction)
    const rows = database
      .prepare(
        `SELECT
          substr(transactions.transaction_date, 1, 7) AS month,
          transactions.currency,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(transactions.amount_minor), 0) AS amount_minor
        FROM transactions
        ${whereSql}
        GROUP BY month, transactions.currency
        ORDER BY month ASC, transactions.currency ASC`,
      )
      .all(...parameters) as MonthlyAmountRow[]

    return rows.map(toMonthlyAmountDto)
  }

  const getExpensesByCategory = (
    query: ValidatedAnalyticsQuery,
  ): readonly AnalyticsCategoryExpenseDto[] => {
    const { parameters, whereSql } = buildDirectionalDateFilter(query, 'expense')
    const rows = database
      .prepare(
        `SELECT
          categories.id AS category_id,
          categories.name AS category_name,
          categories.color AS category_color,
          transactions.currency,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(transactions.amount_minor), 0) AS amount_minor
        FROM transactions
        LEFT JOIN categories ON categories.id = transactions.category_id
        ${whereSql}
        GROUP BY categories.id, categories.name, categories.color, transactions.currency
        ORDER BY amount_minor DESC, category_name COLLATE NOCASE ASC, transactions.currency ASC`,
      )
      .all(...parameters) as CategoryExpenseRow[]

    return rows.map(toCategoryExpenseDto)
  }

  const getLargestExpenses = (
    query: ValidatedAnalyticsQuery,
  ): readonly AnalyticsLargestExpenseDto[] => {
    const { parameters, whereSql } = buildDirectionalDateFilter(query, 'expense')
    const rows = database
      .prepare(
        `SELECT
          transactions.id,
          transactions.transaction_date,
          transactions.description,
          transactions.merchant,
          transactions.amount_minor,
          transactions.currency,
          categories.id AS category_id,
          categories.name AS category_name,
          categories.color AS category_color
        FROM transactions
        LEFT JOIN categories ON categories.id = transactions.category_id
        ${whereSql}
        ORDER BY transactions.amount_minor DESC, transactions.transaction_date DESC, transactions.id ASC
        LIMIT ?`,
      )
      .all(...parameters, query.largestExpensesLimit) as LargestExpenseRow[]

    return rows.map(toLargestExpenseDto)
  }

  return {
    getDashboard: (query) => ({
      expensesByCategory: getExpensesByCategory(query),
      expensesByMonth: getMonthlyAmounts(query, 'expense'),
      incomeByMonth: getMonthlyAmounts(query, 'income'),
      largestExpenses: getLargestExpenses(query),
      periodSummary: getPeriodSummary(query),
    }),
    getExpensesByCategory,
    getExpensesByMonth: (query) => getMonthlyAmounts(query, 'expense'),
    getIncomeByMonth: (query) => getMonthlyAmounts(query, 'income'),
    getLargestExpenses,
    getPeriodSummary,
  }
}
