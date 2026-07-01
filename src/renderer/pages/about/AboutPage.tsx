import { Card, Stack, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { ProjectLifecycleCard } from '../../features/project-lifecycle/ProjectLifecycleCard'
import { PlaceholderPage } from '../../shared/ui/PlaceholderPage'

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
    <PlaceholderPage
      description="A future place for project settings, app version details, and local-first privacy notes."
      emptyDescription="Settings will be added only when project lifecycle features exist."
      emptyTitle="Settings are not available yet."
      eyebrow="Settings / About"
      title="Settings and about placeholder"
    >
      <Card bg="blue-light" padding="lg" radius="md" withBorder>
        <Stack gap={4}>
          <Text fw={700}>App version</Text>
          <Text c="dimmed" size="sm">
            {versionText}
          </Text>
        </Stack>
      </Card>

      <ProjectLifecycleCard />
    </PlaceholderPage>
  )
}
