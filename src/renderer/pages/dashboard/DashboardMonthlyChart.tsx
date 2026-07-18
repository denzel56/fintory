import { Badge, Box, Card, Group, Stack, Text, Title } from '@mantine/core'
import type { AnalyticsMonthlyAmountDto } from '../../../shared/types/analytics'
import { formatMoney, formatMonth } from './dashboard-formatters'

type DashboardMonthlyChartProps = {
  readonly expenses: readonly AnalyticsMonthlyAmountDto[]
  readonly income: readonly AnalyticsMonthlyAmountDto[]
}

type MonthlyChartRow = {
  readonly currency: string
  readonly expenseAmountMinor: number
  readonly expenseCount: number
  readonly incomeAmountMinor: number
  readonly incomeCount: number
  readonly month: string
}

const chartTrackHeight = 10

const getMonthlyRows = (
  expenses: readonly AnalyticsMonthlyAmountDto[],
  income: readonly AnalyticsMonthlyAmountDto[],
): readonly MonthlyChartRow[] => {
  const rowsByKey = new Map<string, MonthlyChartRow>()

  const getRow = (item: AnalyticsMonthlyAmountDto): MonthlyChartRow => {
    const key = `${item.month}-${item.currency}`
    const existingRow = rowsByKey.get(key)

    if (existingRow) {
      return existingRow
    }

    const nextRow: MonthlyChartRow = {
      currency: item.currency,
      expenseAmountMinor: 0,
      expenseCount: 0,
      incomeAmountMinor: 0,
      incomeCount: 0,
      month: item.month,
    }

    rowsByKey.set(key, nextRow)

    return nextRow
  }

  for (const item of expenses) {
    const row = getRow(item)
    rowsByKey.set(`${item.month}-${item.currency}`, {
      ...row,
      expenseAmountMinor: item.amountMinor,
      expenseCount: item.transactionCount,
    })
  }

  for (const item of income) {
    const row = getRow(item)
    rowsByKey.set(`${item.month}-${item.currency}`, {
      ...row,
      incomeAmountMinor: item.amountMinor,
      incomeCount: item.transactionCount,
    })
  }

  return [...rowsByKey.values()].sort((left, right) => {
    const monthSort = left.month.localeCompare(right.month)

    return monthSort === 0 ? left.currency.localeCompare(right.currency) : monthSort
  })
}

const getWidthPercent = (value: number, maxValue: number): string => {
  if (maxValue <= 0 || value <= 0) {
    return '0%'
  }

  return `${Math.max((value / maxValue) * 100, 2)}%`
}

const getMaxAmountByCurrency = (rows: readonly MonthlyChartRow[]): ReadonlyMap<string, number> => {
  const maxAmountByCurrency = new Map<string, number>()

  for (const row of rows) {
    const currentMaxAmount = maxAmountByCurrency.get(row.currency) ?? 0
    const rowMaxAmount = Math.max(row.expenseAmountMinor, row.incomeAmountMinor)

    maxAmountByCurrency.set(row.currency, Math.max(currentMaxAmount, rowMaxAmount))
  }

  return maxAmountByCurrency
}

export function DashboardMonthlyChart({ expenses, income }: DashboardMonthlyChartProps) {
  const rows = getMonthlyRows(expenses, income)
  const maxAmountByCurrency = getMaxAmountByCurrency(rows)

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>Monthly flow</Title>
          <Group gap="xs">
            <Badge color="green" variant="light">
              Income
            </Badge>
            <Badge color="red" variant="light">
              Expenses
            </Badge>
          </Group>
        </Group>

        {rows.length > 0 ? (
          <Stack gap="sm">
            {rows.map((row) => (
              <Stack key={`${row.month}-${row.currency}`} gap={4}>
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm">
                    {formatMonth(row.month)} · {row.currency}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {row.incomeCount + row.expenseCount} transactions
                  </Text>
                </Group>
                <Stack gap={4}>
                  <Group gap="xs" wrap="nowrap">
                    <Text c="green" miw={72} size="xs">
                      Income
                    </Text>
                    <Box bg="dark.5" flex={1} h={chartTrackHeight} style={{ borderRadius: 999 }}>
                      <Box
                        h={chartTrackHeight}
                        style={{
                          backgroundColor: '#2f9e44',
                          borderRadius: 999,
                          width: getWidthPercent(
                            row.incomeAmountMinor,
                            maxAmountByCurrency.get(row.currency) ?? 0,
                          ),
                        }}
                      />
                    </Box>
                    <Text fw={600} miw={120} size="xs" ta="right">
                      {formatMoney(row.incomeAmountMinor, row.currency)}
                    </Text>
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <Text c="red" miw={72} size="xs">
                      Expenses
                    </Text>
                    <Box bg="dark.5" flex={1} h={chartTrackHeight} style={{ borderRadius: 999 }}>
                      <Box
                        h={chartTrackHeight}
                        style={{
                          backgroundColor: '#fa5252',
                          borderRadius: 999,
                          width: getWidthPercent(
                            row.expenseAmountMinor,
                            maxAmountByCurrency.get(row.currency) ?? 0,
                          ),
                        }}
                      />
                    </Box>
                    <Text fw={600} miw={120} size="xs" ta="right">
                      {formatMoney(row.expenseAmountMinor, row.currency)}
                    </Text>
                  </Group>
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" py="md" ta="center">
            No monthly data in this period.
          </Text>
        )}
      </Stack>
    </Card>
  )
}
