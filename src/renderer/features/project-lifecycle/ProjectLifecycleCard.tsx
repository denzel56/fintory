import { Alert, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core'
import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import type {
  CurrentProjectDto,
  CurrentProjectStateDto,
  ProjectErrorCode,
} from '../../../shared/types/project'
import { validateProjectName } from '../../../shared/validation/project'

type ProjectLoadState =
  | { status: 'loading' }
  | { status: 'available'; projectState: CurrentProjectStateDto }
  | { status: 'unavailable'; message: string }

type ProjectAction = 'create' | 'open' | 'close'

type ProjectMessage = {
  color: 'blue' | 'green' | 'yellow'
  text: string
  title: string
}

const projectFailureTitles = {
  'invalid-project-name': 'Project name needs attention',
  'project-create-cancelled': 'Project creation cancelled',
  'project-database-corrupt': 'Project database is not readable',
  'project-database-locked': 'Project database is locked',
  'project-database-open-failed': 'Project could not be opened',
  'project-migration-failed': 'Project database could not be prepared',
  'project-not-found': 'Project file not found',
  'project-open-cancelled': 'Project open cancelled',
  'project-open-failed': 'Project could not be opened',
  'project-close-failed': 'Project could not be closed',
} satisfies Record<ProjectErrorCode, string>

const cancelledProjectErrorCodes = new Set<ProjectErrorCode>([
  'project-create-cancelled',
  'project-open-cancelled',
])

const getProjectStatusText = (projectLoadState: ProjectLoadState): string => {
  if (projectLoadState.status === 'loading') {
    return 'Loading current project state...'
  }

  if (projectLoadState.status === 'unavailable') {
    return projectLoadState.message
  }

  if (projectLoadState.projectState.status === 'none') {
    return 'No project is open.'
  }

  const { display, name } = projectLoadState.projectState.project
  const fileLabel = display.fileName ? ` (${display.fileName})` : ''

  return `${name}${fileLabel}`
}

const loadCurrentProjectState = async (): Promise<ProjectLoadState> => {
  if (!window.fintory) {
    return {
      status: 'unavailable',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  return {
    status: 'available',
    projectState: await window.fintory.project.getCurrent(),
  }
}

const getOpenProjectLoadState = (project: CurrentProjectDto): ProjectLoadState => ({
  status: 'available',
  projectState: { status: 'open', project },
})

const getProjectFailureMessage = (input: {
  code: ProjectErrorCode
  message: string
}): ProjectMessage => ({
  color: cancelledProjectErrorCodes.has(input.code) ? 'blue' : 'yellow',
  text: input.message,
  title: projectFailureTitles[input.code],
})

const getProjectSuccessMessage = (text: string): ProjectMessage => ({
  color: 'green',
  text,
  title: 'Project ready',
})

export function ProjectLifecycleCard() {
  const [projectLoadState, setProjectLoadState] = useState<ProjectLoadState>({
    status: 'loading',
  })
  const [projectName, setProjectName] = useState('')
  const [projectNameError, setProjectNameError] = useState<string | null>(null)
  const [projectAction, setProjectAction] = useState<ProjectAction | null>(null)
  const [projectMessage, setProjectMessage] = useState<ProjectMessage | null>(null)

  const refreshCurrentProjectState = async () => {
    try {
      setProjectLoadState(await loadCurrentProjectState())
    } catch {
      setProjectLoadState({
        status: 'unavailable',
        message: 'Project state is not available right now.',
      })
    }
  }

  useEffect(() => {
    let isMounted = true

    loadCurrentProjectState()
      .then((nextProjectLoadState) => {
        if (isMounted) {
          setProjectLoadState(nextProjectLoadState)
        }
      })
      .catch(() => {
        if (isMounted) {
          setProjectLoadState({
            status: 'unavailable',
            message: 'Project state is not available right now.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const projectStatusText = getProjectStatusText(projectLoadState)
  const isProjectBridgeAvailable = Boolean(window.fintory)
  const isProjectActionRunning = projectAction !== null

  const handleProjectNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProjectName(event.currentTarget.value)
    setProjectNameError(null)
    setProjectMessage(null)
  }

  const handleCreateProject = async () => {
    const validationResult = validateProjectName(projectName)

    if (!validationResult.ok) {
      setProjectNameError(validationResult.message)
      return
    }

    if (!window.fintory) {
      setProjectMessage({
        color: 'yellow',
        text: 'The Electron preload bridge is not available in this runtime.',
        title: 'Project actions unavailable',
      })
      return
    }

    setProjectAction('create')
    setProjectMessage(null)

    try {
      const result = await window.fintory.project.create({ name: validationResult.value })

      if (result.ok) {
        setProjectLoadState(getOpenProjectLoadState(result.project))
        setProjectName('')
        setProjectNameError(null)
        setProjectMessage(
          getProjectSuccessMessage('Project created and connected to local SQLite storage.'),
        )
      } else {
        setProjectMessage(getProjectFailureMessage(result))
        await refreshCurrentProjectState()
      }
    } catch {
      setProjectMessage({
        color: 'yellow',
        text: 'Project creation is not available right now. Try again or choose another location.',
        title: 'Project creation unavailable',
      })
      await refreshCurrentProjectState()
    } finally {
      setProjectAction(null)
    }
  }

  const handleOpenProject = async () => {
    if (!window.fintory) {
      setProjectMessage({
        color: 'yellow',
        text: 'The Electron preload bridge is not available in this runtime.',
        title: 'Project actions unavailable',
      })
      return
    }

    setProjectAction('open')
    setProjectMessage(null)

    try {
      const result = await window.fintory.project.open()

      if (result.ok) {
        setProjectLoadState(getOpenProjectLoadState(result.project))
        setProjectMessage(
          getProjectSuccessMessage('Project opened and connected to local SQLite storage.'),
        )
      } else {
        setProjectMessage(getProjectFailureMessage(result))
        await refreshCurrentProjectState()
      }
    } catch {
      setProjectMessage({
        color: 'yellow',
        text: 'Project open is not available right now. Try again or choose another project.',
        title: 'Project open unavailable',
      })
      await refreshCurrentProjectState()
    } finally {
      setProjectAction(null)
    }
  }

  const handleCloseProject = async () => {
    if (!window.fintory) {
      setProjectMessage({
        color: 'yellow',
        text: 'The Electron preload bridge is not available in this runtime.',
        title: 'Project actions unavailable',
      })
      return
    }

    setProjectAction('close')
    setProjectMessage(null)

    try {
      const result = await window.fintory.project.close()

      if (result.ok) {
        setProjectLoadState({ status: 'available', projectState: { status: 'none' } })
        setProjectMessage({ color: 'green', text: 'Project closed.', title: 'Project closed' })
      } else {
        setProjectMessage(getProjectFailureMessage(result))
        await refreshCurrentProjectState()
      }
    } catch {
      setProjectMessage({
        color: 'yellow',
        text: 'Project close is not available right now. Try again or reopen the app if the project remains unavailable.',
        title: 'Project close unavailable',
      })
      await refreshCurrentProjectState()
    } finally {
      setProjectAction(null)
    }
  }

  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={700}>Current project</Text>
          <Text c="dimmed" size="sm">
            {projectStatusText}
          </Text>
        </Stack>

        <TextInput
          disabled={!isProjectBridgeAvailable || isProjectActionRunning}
          error={projectNameError}
          label="Project name"
          placeholder="Personal finances"
          value={projectName}
          onChange={handleProjectNameChange}
        />

        <Group gap="sm">
          <Button
            disabled={!isProjectBridgeAvailable || isProjectActionRunning}
            loading={projectAction === 'create'}
            onClick={handleCreateProject}
          >
            Create project
          </Button>
          <Button
            disabled={!isProjectBridgeAvailable || isProjectActionRunning}
            loading={projectAction === 'open'}
            variant="light"
            onClick={handleOpenProject}
          >
            Open project
          </Button>
          <Button
            disabled={!isProjectBridgeAvailable || isProjectActionRunning}
            loading={projectAction === 'close'}
            variant="subtle"
            onClick={handleCloseProject}
          >
            Close project
          </Button>
        </Group>

        {projectMessage ? (
          <Alert color={projectMessage.color} title={projectMessage.title} variant="light">
            {projectMessage.text}
          </Alert>
        ) : null}
      </Stack>
    </Card>
  )
}
