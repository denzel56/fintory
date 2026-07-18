import { Badge, Card, Stack, Table, Text, Title } from '@mantine/core'
import type { AnalyticsCategoryExpenseDto } from '../../../shared/types/analytics'
import { DashboardTableEmptyRow } from './DashboardTableEmptyRow'
import { formatMoney } from './dashboard-formatters'

type DashboardCategoryExpensesTableProps = {
  readonly items: readonly AnalyticsCategoryExpenseDto[]
}

export function DashboardCategoryExpensesTable({ items }: DashboardCategoryExpensesTableProps) {
  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Title order={4}>Expenses by category</Title>
        <Table.ScrollContainer minWidth={520}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>Count</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.length > 0
                ? items.map((item) => (
                    <Table.Tr key={`${item.category?.id ?? 'uncategorized'}-${item.currency}`}>
                      <Table.Td>
                        {item.category ? (
                          <Badge color={item.category.color} variant="light">
                            {item.category.name}
                          </Badge>
                        ) : (
                          <Text c="dimmed">Uncategorized</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{item.transactionCount}</Table.Td>
                      <Table.Td ta="right">
                        {formatMoney(item.amountMinor, item.currency)}
                      </Table.Td>
                    </Table.Tr>
                  ))
                : (
                    <DashboardTableEmptyRow
                      colSpan={3}
                      message="No categorized expenses in this period."
                    />
                  )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Card>
  )
}
