import { Table, Text } from '@mantine/core'

type DashboardTableEmptyRowProps = {
  readonly colSpan: number
  readonly message: string
}

export function DashboardTableEmptyRow({ colSpan, message }: DashboardTableEmptyRowProps) {
  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan}>
        <Text c="dimmed" py="md" ta="center">
          {message}
        </Text>
      </Table.Td>
    </Table.Tr>
  )
}
