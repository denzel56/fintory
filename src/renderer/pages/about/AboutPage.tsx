import { Card, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'

type VersionState =
  | { status: 'loading' }
  | { status: 'available'; version: string }
  | { status: 'unavailable'; message: string }

const loadAppVersion = async (): Promise<VersionState> => {
  if (!window.fintory) {
    return {
      status: 'unavailable',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  const version = await window.fintory.app.getVersion()

  return { status: 'available', version }
}

const getVersionText = (versionState: VersionState): string => {
  switch (versionState.status) {
    case 'available':
      return versionState.version
    case 'unavailable':
      return versionState.message
    case 'loading':
      return 'Loading app version through the typed preload bridge...'
  }
}

const workflowSteps = [
  'Create a local project',
  'Import bank CSV exports',
  'Review and categorize transactions',
  'Understand spending history',
]

export function AboutPage() {
  const [versionState, setVersionState] = useState<VersionState>({ status: 'loading' })

  useEffect(() => {
    let isMounted = true

    loadAppVersion()
      .then((nextVersionState) => {
        if (isMounted) {
          setVersionState(nextVersionState)
        }
      })
      .catch(() => {
        if (isMounted) {
          setVersionState({
            status: 'unavailable',
            message: 'App version is not available right now.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const versionText = getVersionText(versionState)

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Text c="dimmed" fw={700} size="xs" tt="uppercase">
          About
        </Text>
        <Title order={3}>Fintory local finance archive</Title>
        <Text c="dimmed">
          Build a private financial history from bank CSV files. Fintory keeps
          data on this computer and avoids cloud sync, telemetry, and bank API
          connections.
        </Text>

        <Card bg="blue-light" padding="lg" radius="md" withBorder>
          <Stack gap={4}>
            <Text fw={700}>App version</Text>
            <Text c="dimmed" size="sm">
              {versionText}
            </Text>
          </Stack>
        </Card>

        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Primary workflow
            </Text>
            <Stack component="ol" gap="md" m={0} pl="md">
              {workflowSteps.map((step) => (
                <Text component="li" fw={600} key={step}>
                  {step}
                </Text>
              ))}
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
