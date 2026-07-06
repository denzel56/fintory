import { Card, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const overviewPreviewItems = [
  {
    label: 'Monthly spending',
    value: 'Waiting for transactions',
    description: 'Track expense totals once CSV imports write transaction history.',
  },
  {
    label: 'Income',
    value: 'Not calculated yet',
    description: 'Summaries will separate income from expense movements.',
  },
  {
    label: 'Top categories',
    value: 'No category totals',
    description: 'Category analytics will use your editable local categories.',
  },
  {
    label: 'Largest expenses',
    value: 'No expense records',
    description: 'Large transactions will be highlighted after import review.',
  },
]

export function DashboardPage() {
  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="lg">
        <Stack gap={4}>
          <Text c="dimmed" fw={700} size="xs" tt="uppercase">
            Overview
          </Text>
          <Title order={3}>Financial snapshot</Title>
        </Stack>

        <Text c="dimmed">
          This page will summarize your local transaction history after CSV imports
          are parsed into the project database.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {overviewPreviewItems.map((item) => (
            <Card bg="blue-light" key={item.label} padding="lg" radius="md" withBorder>
              <Stack gap={4}>
                <Text fw={700}>{item.label}</Text>
                <Text fw={700} size="lg">
                  {item.value}
                </Text>
                <Text c="dimmed" size="sm">
                  {item.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  )
}
