import { ipcMain } from 'electron'
import { analyticsIpcChannels } from '../../shared/ipc/analytics.js'
import type {
  GetAnalyticsCategoryExpensesResult,
  GetAnalyticsDashboardResult,
  GetAnalyticsLargestExpensesResult,
  GetAnalyticsMonthlyAmountsResult,
  GetAnalyticsPeriodSummaryResult,
  ValidatedAnalyticsQuery,
} from '../../shared/types/analytics.js'
import { validateAnalyticsQuery } from '../../shared/validation/analytics.js'
import { getActiveProjectDatabase } from '../db/project-database-connection.js'
import { createAnalyticsRepository } from '../db/repositories/analytics-repository.js'

type AnalyticsResult =
  | GetAnalyticsCategoryExpensesResult
  | GetAnalyticsDashboardResult
  | GetAnalyticsLargestExpensesResult
  | GetAnalyticsMonthlyAmountsResult
  | GetAnalyticsPeriodSummaryResult

type AnalyticsValidationFailure = Extract<AnalyticsResult, { readonly ok: false }>

const getValidatedAnalyticsQuery = (
  input: unknown,
): AnalyticsValidationFailure | ValidatedAnalyticsQuery => {
  const validationResult = validateAnalyticsQuery(input)

  if (!validationResult.ok) {
    return {
      ok: false,
      code: validationResult.code,
      message: validationResult.message,
    }
  }

  return validationResult.value
}

const isAnalyticsValidationFailure = (
  value: AnalyticsValidationFailure | ValidatedAnalyticsQuery,
): value is AnalyticsValidationFailure => {
  return 'ok' in value
}

export function registerAnalyticsIpcHandlers(): void {
  ipcMain.handle(analyticsIpcChannels.getDashboard, (_event, input: unknown): GetAnalyticsDashboardResult => {
    const query = getValidatedAnalyticsQuery(input)

    if (isAnalyticsValidationFailure(query)) {
      return query
    }

    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before viewing analytics.',
      }
    }

    try {
      const analyticsRepository = createAnalyticsRepository(database)

      return { ok: true, dashboard: analyticsRepository.getDashboard(query) }
    } catch {
      return {
        ok: false,
        code: 'analytics-query-failed',
        message: 'Analytics could not be loaded right now.',
      }
    }
  })

  ipcMain.handle(
    analyticsIpcChannels.getPeriodSummary,
    (_event, input: unknown): GetAnalyticsPeriodSummaryResult => {
      const query = getValidatedAnalyticsQuery(input)

      if (isAnalyticsValidationFailure(query)) {
        return query
      }

      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before viewing analytics.',
        }
      }

      try {
        const analyticsRepository = createAnalyticsRepository(database)

        return { ok: true, periodSummary: analyticsRepository.getPeriodSummary(query) }
      } catch {
        return {
          ok: false,
          code: 'analytics-query-failed',
          message: 'Analytics could not be loaded right now.',
        }
      }
    },
  )

  ipcMain.handle(
    analyticsIpcChannels.getExpensesByMonth,
    (_event, input: unknown): GetAnalyticsMonthlyAmountsResult => {
      const query = getValidatedAnalyticsQuery(input)

      if (isAnalyticsValidationFailure(query)) {
        return query
      }

      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before viewing analytics.',
        }
      }

      try {
        const analyticsRepository = createAnalyticsRepository(database)

        return { ok: true, monthlyAmounts: analyticsRepository.getExpensesByMonth(query) }
      } catch {
        return {
          ok: false,
          code: 'analytics-query-failed',
          message: 'Analytics could not be loaded right now.',
        }
      }
    },
  )

  ipcMain.handle(
    analyticsIpcChannels.getIncomeByMonth,
    (_event, input: unknown): GetAnalyticsMonthlyAmountsResult => {
      const query = getValidatedAnalyticsQuery(input)

      if (isAnalyticsValidationFailure(query)) {
        return query
      }

      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before viewing analytics.',
        }
      }

      try {
        const analyticsRepository = createAnalyticsRepository(database)

        return { ok: true, monthlyAmounts: analyticsRepository.getIncomeByMonth(query) }
      } catch {
        return {
          ok: false,
          code: 'analytics-query-failed',
          message: 'Analytics could not be loaded right now.',
        }
      }
    },
  )

  ipcMain.handle(
    analyticsIpcChannels.getExpensesByCategory,
    (_event, input: unknown): GetAnalyticsCategoryExpensesResult => {
      const query = getValidatedAnalyticsQuery(input)

      if (isAnalyticsValidationFailure(query)) {
        return query
      }

      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before viewing analytics.',
        }
      }

      try {
        const analyticsRepository = createAnalyticsRepository(database)

        return { ok: true, categoryExpenses: analyticsRepository.getExpensesByCategory(query) }
      } catch {
        return {
          ok: false,
          code: 'analytics-query-failed',
          message: 'Analytics could not be loaded right now.',
        }
      }
    },
  )

  ipcMain.handle(
    analyticsIpcChannels.getLargestExpenses,
    (_event, input: unknown): GetAnalyticsLargestExpensesResult => {
      const query = getValidatedAnalyticsQuery(input)

      if (isAnalyticsValidationFailure(query)) {
        return query
      }

      const database = getActiveProjectDatabase()

      if (!database) {
        return {
          ok: false,
          code: 'project-not-open',
          message: 'Open or create a project before viewing analytics.',
        }
      }

      try {
        const analyticsRepository = createAnalyticsRepository(database)

        return { ok: true, largestExpenses: analyticsRepository.getLargestExpenses(query) }
      } catch {
        return {
          ok: false,
          code: 'analytics-query-failed',
          message: 'Analytics could not be loaded right now.',
        }
      }
    },
  )
}
