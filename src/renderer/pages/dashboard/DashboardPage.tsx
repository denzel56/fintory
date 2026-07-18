import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type { AnalyticsDashboardDto } from '../../../shared/types/analytics'
import { DashboardCategoryExpensesTable } from './DashboardCategoryExpensesTable'
import { DashboardLargestExpensesTable } from './DashboardLargestExpensesTable'
import { DashboardMonthlyTable } from './DashboardMonthlyTable'
import { getPeriodLabel } from './dashboard-formatters'
import { DashboardPeriodFilters } from './DashboardPeriodFilters'
import type { DashboardQueryState } from './DashboardPeriodFilters'
import { DashboardSummaryCards } from './DashboardSummaryCards'

type DashboardLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly dashboard: AnalyticsDashboardDto }
  | { readonly status: 'error'; readonly message: string }

const defaultDashboardQuery: DashboardQueryState = {
  fromDate: null,
  toDate: null,
}

const largestExpensesLimit = 10

const loadDashboardState = async (query: DashboardQueryState): Promise<DashboardLoadState> => {
  if (!window.fintory) {
    return {
      status: 'error',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  try {
    const result = await window.fintory.analytics.getDashboard({
      ...query,
      largestExpensesLimit,
    })

    if (result.ok) {
      return { status: 'loaded', dashboard: result.dashboard }
    }

    return { status: 'error', message: result.message }
  } catch {
    return {
      status: 'error',
      message: 'Dashboard analytics could not be loaded right now.',
    }
  }
}

export function DashboardPage() {
  const [dashboardQuery, setDashboardQuery] =
    useState<DashboardQueryState>(defaultDashboardQuery)
  const [dashboardLoadState, setDashboardLoadState] = useState<DashboardLoadState>({
    status: 'loading',
  })

  useEffect(() => {
    let isMounted = true

    loadDashboardState(dashboardQuery).then((nextDashboardLoadState) => {
      if (isMounted) {
        setDashboardLoadState(nextDashboardLoadState)
      }
    })

    return () => {
      isMounted = false
    }
  }, [dashboardQuery])

  const dashboard = dashboardLoadState.status === 'loaded' ? dashboardLoadState.dashboard : null
  const summaryRows = dashboard?.periodSummary.totalsByCurrency ?? []
  const expensesByMonth = dashboard?.expensesByMonth ?? []
  const incomeByMonth = dashboard?.incomeByMonth ?? []
  const expensesByCategory = dashboard?.expensesByCategory ?? []
  const largestExpenses = dashboard?.largestExpenses ?? []
  const transactionCount = dashboard?.periodSummary.transactionCount ?? 0
  const isLoading = dashboardLoadState.status === 'loading'
  const hasTransactions = transactionCount > 0
  const hasPeriodFilter = Boolean(dashboardQuery.fromDate || dashboardQuery.toDate)

  const updateQuery = (partialQuery: Partial<DashboardQueryState>) => {
    setDashboardLoadState({ status: 'loading' })
    setDashboardQuery((currentQuery) => ({ ...currentQuery, ...partialQuery }))
  }

  const resetQuery = () => {
    setDashboardLoadState({ status: 'loading' })
    setDashboardQuery(defaultDashboardQuery)
  }

  const refreshDashboard = () => {
    setDashboardLoadState({ status: 'loading' })
    loadDashboardState(dashboardQuery).then(setDashboardLoadState)
  }

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="lg">
        <Group align="flex-start" justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Overview
            </Text>
            <Title order={3}>Financial snapshot</Title>
            <Text c="dimmed">{getPeriodLabel(dashboardQuery)}</Text>
          </Stack>
          <Button loading={isLoading} variant="light" onClick={refreshDashboard}>
            Refresh
          </Button>
        </Group>

        <DashboardPeriodFilters
          query={dashboardQuery}
          onQueryChange={updateQuery}
          onReset={resetQuery}
        />

        {dashboardLoadState.status === 'error' ? (
          <Alert color="red" title="Dashboard unavailable">
            {dashboardLoadState.message}
          </Alert>
        ) : null}

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : null}

        {dashboardLoadState.status === 'loaded' && !hasTransactions ? (
          <Alert
            color="blue"
            title={hasPeriodFilter ? 'No transactions in this period' : 'No transactions yet'}
          >
            {hasPeriodFilter ? (
              <Stack align="flex-start" gap="sm">
                <Text>
                  Try a different date range or reset the period filter to see all imported
                  transactions.
                </Text>
                <Button size="xs" variant="light" onClick={resetQuery}>
                  Reset period
                </Button>
              </Stack>
            ) : (
              'Import CSV files to see income, expenses, categories, and largest expenses on this dashboard.'
            )}
          </Alert>
        ) : null}

        {dashboardLoadState.status === 'loaded' && hasTransactions ? (
          <Stack gap="lg">
            <DashboardSummaryCards summaries={summaryRows} />

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <DashboardMonthlyTable
                emptyMessage="No expenses in this period."
                items={expensesByMonth}
                title="Expenses by month"
              />
              <DashboardMonthlyTable
                emptyMessage="No income in this period."
                items={incomeByMonth}
                title="Income by month"
              />
            </SimpleGrid>

            <DashboardCategoryExpensesTable items={expensesByCategory} />
            <DashboardLargestExpensesTable items={largestExpenses} />
          </Stack>
        ) : null}
      </Stack>
    </Card>
  )
}
