import { Card, Group, Stack, Table, Text, Title } from '@mantine/core'

const transactionPreviewColumns = ['Date', 'Description', 'Category', 'Amount']

const transactionTools = [
  'Search imported descriptions',
  'Filter by date range and category',
  'Sort transactions for review',
]

export function TransactionsPage() {
  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="lg">
        <Stack gap={4}>
          <Text c="dimmed" fw={700} size="xs" tt="uppercase">
            Transactions
          </Text>
          <Title order={3}>Transaction browser</Title>
        </Stack>

        <Text c="dimmed">
          Imported transactions will be searchable, sortable, and ready for category
          review here. Until CSV parsing is connected, there are no rows to show.
        </Text>

        <Group align="stretch" grow preventGrowOverflow={false}>
          {transactionTools.map((tool) => (
            <Card key={tool} padding="md" radius="md" withBorder>
              <Text fw={600} size="sm">
                {tool}
              </Text>
            </Card>
          ))}
        </Group>

        <Card bg="blue-light" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Stack gap={4}>
              <Text fw={700}>No imported transactions yet.</Text>
              <Text c="dimmed" size="sm">
                Create or open a project, then import bank CSV files to build the
                local transaction list.
              </Text>
            </Stack>

            <Table.ScrollContainer minWidth={560}>
              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    {transactionPreviewColumns.map((column) => (
                      <Table.Th key={column}>{column}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td colSpan={transactionPreviewColumns.length}>
                      <Text c="dimmed" ta="center">
                        Transaction rows will appear after import.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
