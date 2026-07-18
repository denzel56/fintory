import { Card, Stack, Table, Title } from '@mantine/core'
import type { AnalyticsMonthlyAmountDto } from '../../../shared/types/analytics'
import { DashboardTableEmptyRow } from './DashboardTableEmptyRow'
import { formatMoney, formatMonth } from './dashboard-formatters'

type DashboardMonthlyTableProps = {
  readonly emptyMessage: string
  readonly items: readonly AnalyticsMonthlyAmountDto[]
  readonly title: string
}

export function DashboardMonthlyTable({ emptyMessage, items, title }: DashboardMonthlyTableProps) {
  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Title order={4}>{title}</Title>
        <Table.ScrollContainer minWidth={420}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Month</Table.Th>
                <Table.Th>Count</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.length > 0
                ? items.map((item) => (
                    <Table.Tr key={`${item.month}-${item.currency}`}>
                      <Table.Td>{formatMonth(item.month)}</Table.Td>
                      <Table.Td>{item.transactionCount}</Table.Td>
                      <Table.Td ta="right">{formatMoney(item.amountMinor, item.currency)}</Table.Td>
                    </Table.Tr>
                  ))
                : <DashboardTableEmptyRow colSpan={3} message={emptyMessage} />}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Card>
  )
}
