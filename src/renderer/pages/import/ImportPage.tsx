import { Alert, Button, Card, Group, List, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import type { SelectedCsvFileMetadata } from '../../../shared/types/import'

type CsvSelectionState =
  | { readonly status: 'idle'; readonly files: readonly SelectedCsvFileMetadata[] }
  | { readonly status: 'selecting'; readonly files: readonly SelectedCsvFileMetadata[] }
  | {
      readonly status: 'message'
      readonly files: readonly SelectedCsvFileMetadata[]
      readonly message: string
    }
  | {
      readonly status: 'error'
      readonly files: readonly SelectedCsvFileMetadata[]
      readonly message: string
    }

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportPage() {
  const [csvSelectionState, setCsvSelectionState] = useState<CsvSelectionState>({
    status: 'idle',
    files: [],
  })
  const isSelecting = csvSelectionState.status === 'selecting'
  const selectedFiles = csvSelectionState.files

  const handleSelectCsvFiles = async () => {
    if (!window.fintory) {
      setCsvSelectionState({
        status: 'error',
        files: selectedFiles,
        message: 'The Electron preload bridge is not available in this runtime.',
      })
      return
    }

    setCsvSelectionState({ status: 'selecting', files: selectedFiles })

    try {
      const result = await window.fintory.import.selectCsvFiles()

      if (!result.ok) {
        setCsvSelectionState({
          status: 'error',
          files: selectedFiles,
          message: result.message,
        })
        return
      }

      if (result.canceled) {
        setCsvSelectionState({
          status: 'message',
          files: selectedFiles,
          message: 'CSV file selection was cancelled.',
        })
        return
      }

      setCsvSelectionState({ status: 'idle', files: result.files })
    } catch {
      setCsvSelectionState({
        status: 'error',
        files: selectedFiles,
        message: 'CSV files could not be selected right now.',
      })
    }
  }

  const selectedFileItems = selectedFiles.map((file) => (
    <List.Item key={file.selectionId}>
      <Text fw={600} span>
        {file.fileName}
      </Text>{' '}
      <Text c="dimmed" span>
        {formatFileSize(file.sizeBytes)} · {file.extension.toUpperCase().replace('.', '')}
      </Text>
    </List.Item>
  ))

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Group align="flex-start" justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              CSV Import
            </Text>
            <Title order={3}>Select CSV files</Title>
          </Stack>
          <Button loading={isSelecting} onClick={handleSelectCsvFiles}>
            Select CSV files
          </Button>
        </Group>

        <Text c="dimmed">
          Choose one or more local bank CSV exports. Fintory only stores safe file
          metadata in this step; parsing and importing will be added later.
        </Text>

        {csvSelectionState.status === 'error' ? (
          <Alert color="yellow" title="CSV selection unavailable">
            {csvSelectionState.message}
          </Alert>
        ) : null}

        {csvSelectionState.status === 'message' ? (
          <Alert title="CSV selection">{csvSelectionState.message}</Alert>
        ) : null}

        {selectedFiles.length > 0 ? (
          <Card bg="blue-light" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              <Text fw={700}>Selected files ({selectedFiles.length})</Text>
              <List spacing="xs">{selectedFileItems}</List>
            </Stack>
          </Card>
        ) : (
          <Card bg="blue-light" padding="lg" radius="md" withBorder>
            <Stack gap={4}>
              <Text fw={700}>No CSV files selected.</Text>
              <Text c="dimmed" size="sm">
                Select files to prepare for a future import review. No file contents
                are read yet.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
