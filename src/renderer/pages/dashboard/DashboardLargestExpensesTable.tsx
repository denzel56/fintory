import { Card, Stack, Table, Text, Title } from '@mantine/core'
import type { AnalyticsLargestExpenseDto } from '../../../shared/types/analytics'
import { DashboardTableEmptyRow } from './DashboardTableEmptyRow'
import { formatMoney, formatTransactionDate } from './dashboard-formatters'

type DashboardLargestExpensesTableProps = {
  readonly items: readonly AnalyticsLargestExpenseDto[]
}

const getCategoryName = (item: AnalyticsLargestExpenseDto): string => {
  return item.category?.name ?? 'Uncategorized'
}

export function DashboardLargestExpensesTable({ items }: DashboardLargestExpensesTableProps) {
  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Title order={4}>Largest expenses</Title>
        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.length > 0
                ? items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{formatTransactionDate(item.transactionDate)}</Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={600}>{item.description}</Text>
                          {item.merchant ? (
                            <Text c="dimmed" size="sm">
                              {item.merchant}
                            </Text>
                          ) : null}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{getCategoryName(item)}</Table.Td>
                      <Table.Td ta="right">
                        {formatMoney(item.amountMinor, item.currency)}
                      </Table.Td>
                    </Table.Tr>
                  ))
                : <DashboardTableEmptyRow colSpan={4} message="No expenses in this period." />}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Card>
  )
}
