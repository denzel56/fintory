import type { CategoryDto } from './category.js'

export type AnalyticsQuery = {
  readonly fromDate?: string | null
  readonly largestExpensesLimit?: number
  readonly toDate?: string | null
}

export type ValidatedAnalyticsQuery = {
  readonly fromDate: string | null
  readonly largestExpensesLimit: number
  readonly toDate: string | null
}

export type AnalyticsCurrencySummaryDto = {
  readonly currency: string
  readonly expenseCount: number
  readonly expenseTotalMinor: number
  readonly incomeCount: number
  readonly incomeTotalMinor: number
  readonly netTotalMinor: number
}

export type AnalyticsPeriodSummaryDto = {
  readonly totalsByCurrency: readonly AnalyticsCurrencySummaryDto[]
  readonly transactionCount: number
}

export type AnalyticsMonthlyAmountDto = {
  readonly amountMinor: number
  readonly currency: string
  readonly month: string
  readonly transactionCount: number
}

export type AnalyticsCategoryExpenseDto = {
  readonly amountMinor: number
  readonly category: CategoryDto | null
  readonly currency: string
  readonly transactionCount: number
}

export type AnalyticsLargestExpenseDto = {
  readonly amountMinor: number
  readonly category: CategoryDto | null
  readonly currency: string
  readonly description: string
  readonly id: string
  readonly merchant: string | null
  readonly transactionDate: string
}

export type AnalyticsDashboardDto = {
  readonly expensesByCategory: readonly AnalyticsCategoryExpenseDto[]
  readonly expensesByMonth: readonly AnalyticsMonthlyAmountDto[]
  readonly incomeByMonth: readonly AnalyticsMonthlyAmountDto[]
  readonly largestExpenses: readonly AnalyticsLargestExpenseDto[]
  readonly periodSummary: AnalyticsPeriodSummaryDto
}

export type AnalyticsErrorCode =
  | 'analytics-query-failed'
  | 'invalid-analytics-query'
  | 'project-not-open'

export type GetAnalyticsDashboardResult =
  | { readonly ok: true; readonly dashboard: AnalyticsDashboardDto }
  | { readonly ok: false; readonly code: AnalyticsErrorCode; readonly message: string }

export type GetAnalyticsPeriodSummaryResult =
  | { readonly ok: true; readonly periodSummary: AnalyticsPeriodSummaryDto }
  | { readonly ok: false; readonly code: AnalyticsErrorCode; readonly message: string }

export type GetAnalyticsMonthlyAmountsResult =
  | { readonly ok: true; readonly monthlyAmounts: readonly AnalyticsMonthlyAmountDto[] }
  | { readonly ok: false; readonly code: AnalyticsErrorCode; readonly message: string }

export type GetAnalyticsCategoryExpensesResult =
  | { readonly ok: true; readonly categoryExpenses: readonly AnalyticsCategoryExpenseDto[] }
  | { readonly ok: false; readonly code: AnalyticsErrorCode; readonly message: string }

export type GetAnalyticsLargestExpensesResult =
  | { readonly ok: true; readonly largestExpenses: readonly AnalyticsLargestExpenseDto[] }
  | { readonly ok: false; readonly code: AnalyticsErrorCode; readonly message: string }
