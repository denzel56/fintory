import {
  Alert,
  Button,
  Card,
  Group,
  List,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type { ImportBatchDto, SelectedCsvFileMetadata } from '../../../shared/types/import'

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

type ImportBatchesLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly batches: readonly ImportBatchDto[] }
  | { readonly status: 'error'; readonly message: string }

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatImportDate = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

const loadImportBatchesState = async (): Promise<ImportBatchesLoadState> => {
  if (!window.fintory) {
    return {
      status: 'error',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  try {
    const result = await window.fintory.import.listBatches()

    if (result.ok) {
      return { status: 'loaded', batches: result.batches }
    }

    return { status: 'error', message: result.message }
  } catch {
    return {
      status: 'error',
      message: 'Import history could not be loaded right now.',
    }
  }
}

export function ImportPage() {
  const [csvSelectionState, setCsvSelectionState] = useState<CsvSelectionState>({
    status: 'idle',
    files: [],
  })
  const [importBatchesLoadState, setImportBatchesLoadState] =
    useState<ImportBatchesLoadState>({ status: 'loading' })
  const isSelecting = csvSelectionState.status === 'selecting'
  const selectedFiles = csvSelectionState.files
  const importBatches =
    importBatchesLoadState.status === 'loaded' ? importBatchesLoadState.batches : []
  const isImportHistoryLoading = importBatchesLoadState.status === 'loading'

  const loadImportBatches = async () => {
    setImportBatchesLoadState({ status: 'loading' })
    setImportBatchesLoadState(await loadImportBatchesState())
  }

  useEffect(() => {
    let isMounted = true

    loadImportBatchesState().then((nextImportBatchesLoadState) => {
      if (isMounted) {
        setImportBatchesLoadState(nextImportBatchesLoadState)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

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

  const importBatchRows = importBatches.map((batch) => (
    <Table.Tr key={batch.id}>
      <Table.Td>
        <Text fw={600}>{batch.sourceFileName}</Text>
      </Table.Td>
      <Table.Td>{formatImportDate(batch.importedAt)}</Table.Td>
      <Table.Td>{batch.adapterId}</Table.Td>
      <Table.Td>{batch.rowCount}</Table.Td>
      <Table.Td>{batch.insertedCount}</Table.Td>
      <Table.Td>{batch.duplicateCount}</Table.Td>
      <Table.Td>{batch.failedCount}</Table.Td>
    </Table.Tr>
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

        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={4}>
                <Text fw={700}>Import history</Text>
                <Text c="dimmed" size="sm">
                  Review CSV import batches already stored in the active local project.
                </Text>
              </Stack>
              <Button
                loading={isImportHistoryLoading}
                variant="light"
                onClick={() => void loadImportBatches()}
              >
                Refresh history
              </Button>
            </Group>

            {importBatchesLoadState.status === 'error' ? (
              <Alert color="yellow" title="Import history unavailable">
                {importBatchesLoadState.message}
              </Alert>
            ) : null}

            {isImportHistoryLoading ? (
              <Group gap="sm">
                <Loader size="sm" />
                <Text c="dimmed" size="sm">
                  Loading import history...
                </Text>
              </Group>
            ) : null}

            {importBatchesLoadState.status === 'loaded' && importBatches.length === 0 ? (
              <Card bg="blue-light" padding="md" radius="md" withBorder>
                <Stack gap={4}>
                  <Text fw={700}>No import batches yet.</Text>
                  <Text c="dimmed" size="sm">
                    Future imports will appear here after CSV parsing and database writes
                    are implemented.
                  </Text>
                </Stack>
              </Card>
            ) : null}

            {importBatches.length > 0 ? (
              <Table.ScrollContainer minWidth={760}>
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>File</Table.Th>
                      <Table.Th>Imported</Table.Th>
                      <Table.Th>Adapter</Table.Th>
                      <Table.Th>Rows</Table.Th>
                      <Table.Th>Inserted</Table.Th>
                      <Table.Th>Duplicates</Table.Th>
                      <Table.Th>Failed</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{importBatchRows}</Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : null}
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
