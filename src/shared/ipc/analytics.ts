import type {
  AnalyticsQuery,
  GetAnalyticsCategoryExpensesResult,
  GetAnalyticsDashboardResult,
  GetAnalyticsLargestExpensesResult,
  GetAnalyticsMonthlyAmountsResult,
  GetAnalyticsPeriodSummaryResult,
} from '../types/analytics.js'

export const analyticsIpcChannels = {
  getDashboard: 'analytics:getDashboard',
  getExpensesByCategory: 'analytics:getExpensesByCategory',
  getExpensesByMonth: 'analytics:getExpensesByMonth',
  getIncomeByMonth: 'analytics:getIncomeByMonth',
  getLargestExpenses: 'analytics:getLargestExpenses',
  getPeriodSummary: 'analytics:getPeriodSummary',
} as const

export type AnalyticsApi = {
  getDashboard: (query?: AnalyticsQuery) => Promise<GetAnalyticsDashboardResult>
  getExpensesByCategory: (query?: AnalyticsQuery) => Promise<GetAnalyticsCategoryExpensesResult>
  getExpensesByMonth: (query?: AnalyticsQuery) => Promise<GetAnalyticsMonthlyAmountsResult>
  getIncomeByMonth: (query?: AnalyticsQuery) => Promise<GetAnalyticsMonthlyAmountsResult>
  getLargestExpenses: (query?: AnalyticsQuery) => Promise<GetAnalyticsLargestExpensesResult>
  getPeriodSummary: (query?: AnalyticsQuery) => Promise<GetAnalyticsPeriodSummaryResult>
}
