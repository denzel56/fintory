import { Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import type { AnalyticsCurrencySummaryDto } from '../../../shared/types/analytics'
import { formatMoney, formatSignedMoney } from './dashboard-formatters'

type DashboardSummaryCardsProps = {
  readonly summaries: readonly AnalyticsCurrencySummaryDto[]
}

export function DashboardSummaryCards({ summaries }: DashboardSummaryCardsProps) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {summaries.map((summary) => (
        <Card key={summary.currency} padding="md" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={700}>{summary.currency}</Text>
              <Badge variant="light">
                {summary.expenseCount + summary.incomeCount} transactions
              </Badge>
            </Group>
            <Group grow>
              <Stack gap={2}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Income
                </Text>
                <Text c="green" fw={700}>
                  {formatMoney(summary.incomeTotalMinor, summary.currency)}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Expenses
                </Text>
                <Text c="red" fw={700}>
                  {formatMoney(summary.expenseTotalMinor, summary.currency)}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Net
                </Text>
                <Text c={summary.netTotalMinor >= 0 ? 'green' : 'red'} fw={700}>
                  {formatSignedMoney(summary.netTotalMinor, summary.currency)}
                </Text>
              </Stack>
            </Group>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  )
}
