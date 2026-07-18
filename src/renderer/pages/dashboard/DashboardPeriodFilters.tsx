import { Button, Card, Group, TextInput } from '@mantine/core'

export type DashboardQueryState = {
  readonly fromDate: string | null
  readonly toDate: string | null
}

type DashboardPeriodFiltersProps = {
  readonly query: DashboardQueryState
  readonly onQueryChange: (partialQuery: Partial<DashboardQueryState>) => void
  readonly onReset: () => void
}

export function DashboardPeriodFilters({
  onQueryChange,
  onReset,
  query,
}: DashboardPeriodFiltersProps) {
  return (
    <Card padding="md" radius="md" withBorder>
      <Group align="flex-end" grow>
        <TextInput
          label="From date"
          type="date"
          value={query.fromDate ?? ''}
          onChange={(event) => onQueryChange({ fromDate: event.currentTarget.value || null })}
        />
        <TextInput
          label="To date"
          type="date"
          value={query.toDate ?? ''}
          onChange={(event) => onQueryChange({ toDate: event.currentTarget.value || null })}
        />
        <Button
          disabled={!query.fromDate && !query.toDate}
          variant="subtle"
          onClick={onReset}
        >
          Reset period
        </Button>
      </Group>
    </Card>
  )
}
