import { Card, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

type PlaceholderPageProps = {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  children?: ReactNode
}

export function PlaceholderPage({
  children,
  description,
  emptyDescription,
  emptyTitle,
  eyebrow,
  title,
}: PlaceholderPageProps) {
  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Text c="dimmed" fw={700} size="xs" tt="uppercase">
          {eyebrow}
        </Text>
        <Title order={3}>{title}</Title>
        <Text c="dimmed">{description}</Text>
        <Card bg="blue-light" padding="lg" radius="md" withBorder>
          <Stack gap={4}>
            <Text fw={700}>{emptyTitle}</Text>
            <Text c="dimmed" size="sm">
              {emptyDescription}
            </Text>
          </Stack>
        </Card>
        {children}
      </Stack>
    </Card>
  )
}
