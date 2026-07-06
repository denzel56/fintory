import { Card, List, Stack, Text, Title } from '@mantine/core'

const futureSettingsBoundaries = [
  'Only local project and app preferences belong here.',
  'No cloud sync, telemetry, or bank connections will be added by default.',
  'Settings will stay minimal until a real workflow needs them.',
]

export function SettingsPage() {
  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Stack gap={4}>
          <Text c="dimmed" fw={700} size="xs" tt="uppercase">
            Settings
          </Text>
          <Title order={3}>App settings</Title>
        </Stack>

        <Text c="dimmed">
          There are no settings to configure yet. Fintory will add preferences only
          when they make the local CSV workflow clearer or safer.
        </Text>

        <Card bg="blue-light" padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Text fw={700}>Future settings will stay intentionally small.</Text>
            <List c="dimmed" size="sm" spacing="xs">
              {futureSettingsBoundaries.map((boundary) => (
                <List.Item key={boundary}>{boundary}</List.Item>
              ))}
            </List>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
