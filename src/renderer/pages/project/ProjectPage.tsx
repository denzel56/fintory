import { Card, Stack, Text, Title } from '@mantine/core'
import { ProjectLifecycleCard } from '../../features/project-lifecycle/ProjectLifecycleCard'

export function ProjectPage() {
  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Stack gap={4}>
          <Text c="dimmed" fw={700} size="xs" tt="uppercase">
            Project
          </Text>
          <Title order={3}>Local project</Title>
        </Stack>

        <Text c="dimmed">
          Create, open, or close the local SQLite project that stores your private
          financial history on this computer.
        </Text>

        <ProjectLifecycleCard />
      </Stack>
    </Card>
  )
}
