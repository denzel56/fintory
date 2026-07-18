import { Badge, Box, Card, Group, Stack, Text, Title } from '@mantine/core'
import type { AnalyticsCategoryExpenseDto } from '../../../shared/types/analytics'
import { formatMoney } from './dashboard-formatters'

type DashboardCategoryChartProps = {
  readonly items: readonly AnalyticsCategoryExpenseDto[]
}

const chartTrackHeight = 14
const uncategorizedColor = '#868e96'

const getCategoryLabel = (item: AnalyticsCategoryExpenseDto): string => {
  return item.category?.name ?? 'Uncategorized'
}

const getCategoryColor = (item: AnalyticsCategoryExpenseDto): string => {
  return item.category?.color ?? uncategorizedColor
}

const getWidthPercent = (value: number, maxValue: number): string => {
  if (maxValue <= 0 || value <= 0) {
    return '0%'
  }

  return `${Math.max((value / maxValue) * 100, 2)}%`
}

const getMaxAmountByCurrency = (
  items: readonly AnalyticsCategoryExpenseDto[],
): ReadonlyMap<string, number> => {
  const maxAmountByCurrency = new Map<string, number>()

  for (const item of items) {
    const currentMaxAmount = maxAmountByCurrency.get(item.currency) ?? 0

    maxAmountByCurrency.set(item.currency, Math.max(currentMaxAmount, item.amountMinor))
  }

  return maxAmountByCurrency
}

export function DashboardCategoryChart({ items }: DashboardCategoryChartProps) {
  const maxAmountByCurrency = getMaxAmountByCurrency(items)

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Title order={4}>Category breakdown</Title>

        {items.length > 0 ? (
          <Stack gap="sm">
            {items.map((item) => {
              const categoryLabel = getCategoryLabel(item)
              const categoryColor = getCategoryColor(item)

              return (
                <Stack key={`${item.category?.id ?? 'uncategorized'}-${item.currency}`} gap={4}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      {item.category ? (
                        <Badge color={categoryColor} variant="light">
                          {categoryLabel}
                        </Badge>
                      ) : (
                        <Text c="dimmed" fw={600} size="sm">
                          {categoryLabel}
                        </Text>
                      )}
                      <Text c="dimmed" size="xs">
                        {item.transactionCount} transactions
                      </Text>
                    </Group>
                    <Text fw={700} size="sm">
                      {formatMoney(item.amountMinor, item.currency)}
                    </Text>
                  </Group>
                  <Box bg="dark.5" h={chartTrackHeight} style={{ borderRadius: 999 }}>
                    <Box
                      h={chartTrackHeight}
                      style={{
                        backgroundColor: categoryColor,
                        borderRadius: 999,
                        width: getWidthPercent(
                          item.amountMinor,
                          maxAmountByCurrency.get(item.currency) ?? 0,
                        ),
                      }}
                    />
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        ) : (
          <Text c="dimmed" py="md" ta="center">
            No category expenses in this period.
          </Text>
        )}
      </Stack>
    </Card>
  )
}
