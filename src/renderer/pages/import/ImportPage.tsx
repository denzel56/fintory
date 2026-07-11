import {
  Alert,
  Button,
  Card,
  Group,
  List,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type {
  ImportBatchDto,
  ImportCsvFilesResult,
  ImportDiagnosticDto,
  SelectedCsvFileMetadata,
} from '../../../shared/types/import'

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

type ImportSuccessResult = Extract<ImportCsvFilesResult, { readonly ok: true }>

type CsvImportState =
  | { readonly status: 'idle' }
  | { readonly status: 'importing' }
  | { readonly status: 'success'; readonly result: ImportSuccessResult }
  | { readonly status: 'error'; readonly message: string }

type ClearImportHistoryState =
  | { readonly status: 'idle' }
  | { readonly status: 'clearing' }
  | { readonly status: 'success'; readonly clearedCount: number }
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

const formatDiagnosticRows = (diagnostic: ImportDiagnosticDto): string => {
  if (diagnostic.rowNumbers.length === 0) {
    return ''
  }

  return ` Rows: ${diagnostic.rowNumbers.join(', ')}${
    diagnostic.count > diagnostic.rowNumbers.length ? ', ...' : ''
  }.`
}

const formatDiagnosticColumn = (diagnostic: ImportDiagnosticDto): string => {
  return diagnostic.columnName ? ` Column: ${diagnostic.columnName}.` : ''
}

const formatImportDiagnostic = (diagnostic: ImportDiagnosticDto): string => {
  return `${diagnostic.message} (${diagnostic.count}).${formatDiagnosticColumn(
    diagnostic,
  )}${formatDiagnosticRows(diagnostic)}`
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
  const [csvImportState, setCsvImportState] = useState<CsvImportState>({ status: 'idle' })
  const [clearImportHistoryState, setClearImportHistoryState] =
    useState<ClearImportHistoryState>({ status: 'idle' })
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false)
  const isSelecting = csvSelectionState.status === 'selecting'
  const selectedFiles = csvSelectionState.files
  const importBatches =
    importBatchesLoadState.status === 'loaded' ? importBatchesLoadState.batches : []
  const isImportHistoryLoading = importBatchesLoadState.status === 'loading'
  const isImporting = csvImportState.status === 'importing'
  const isClearingImportHistory = clearImportHistoryState.status === 'clearing'
  const canImportSelectedFiles = selectedFiles.length > 0 && !isSelecting && !isImporting
  const canClearImportHistory =
    importBatches.length > 0 && !isImportHistoryLoading && !isClearingImportHistory

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

      setCsvImportState({ status: 'idle' })
      setCsvSelectionState({ status: 'idle', files: result.files })
    } catch {
      setCsvSelectionState({
        status: 'error',
        files: selectedFiles,
        message: 'CSV files could not be selected right now.',
      })
    }
  }

  const handleImportCsvFiles = async () => {
    if (!window.fintory) {
      setCsvImportState({
        status: 'error',
        message: 'The Electron preload bridge is not available in this runtime.',
      })
      return
    }

    if (selectedFiles.length === 0) {
      setCsvImportState({
        status: 'error',
        message: 'Select one or more CSV files before importing.',
      })
      return
    }

    setCsvImportState({ status: 'importing' })

    try {
      const result = await window.fintory.import.importCsvFiles({
        selectionIds: selectedFiles.map((file) => file.selectionId),
      })

      if (!result.ok) {
        setCsvImportState({ status: 'error', message: result.message })
        return
      }

      setCsvImportState({ status: 'success', result })
      await loadImportBatches()
    } catch {
      setCsvImportState({
        status: 'error',
        message: 'CSV files could not be imported right now.',
      })
    }
  }

  const handleClearImportHistory = async () => {
    if (!window.fintory) {
      setClearImportHistoryState({
        status: 'error',
        message: 'The Electron preload bridge is not available in this runtime.',
      })
      return
    }

    setClearImportHistoryState({ status: 'clearing' })

    try {
      const result = await window.fintory.import.clearHistory()

      if (!result.ok) {
        setIsClearHistoryModalOpen(false)
        setClearImportHistoryState({ status: 'error', message: result.message })
        return
      }

      setIsClearHistoryModalOpen(false)
      setClearImportHistoryState({ status: 'success', clearedCount: result.clearedCount })
      await loadImportBatches()
    } catch {
      setIsClearHistoryModalOpen(false)
      setClearImportHistoryState({
        status: 'error',
        message: 'Import history could not be cleared right now.',
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
  const importResultFileRows =
    csvImportState.status === 'success'
      ? csvImportState.result.files.map((file, index) => (
          <Table.Tr key={`${file.fileName}-${file.adapterId}-${index}`}>
            <Table.Td>
              <Text fw={600}>{file.fileName}</Text>
            </Table.Td>
            <Table.Td>{file.adapterId}</Table.Td>
            <Table.Td>{file.rowCount}</Table.Td>
            <Table.Td>{file.insertedCount}</Table.Td>
            <Table.Td>{file.duplicateCount}</Table.Td>
            <Table.Td>{file.failedCount}</Table.Td>
          </Table.Tr>
        ))
      : []
  const importDiagnosticItems =
    csvImportState.status === 'success'
      ? csvImportState.result.files.flatMap((file, fileIndex) =>
          file.diagnostics.map((diagnostic, diagnosticIndex) => (
            <List.Item key={`${file.fileName}-${fileIndex}-${diagnostic.code}-${diagnosticIndex}`}>
              <Text fw={600} span>
                {file.fileName}:{' '}
              </Text>
              <Text span>{formatImportDiagnostic(diagnostic)}</Text>
            </List.Item>
          )),
        )
      : []
  const importResult = csvImportState.status === 'success' ? csvImportState.result : null
  const hasImportFailures = (importResult?.failedCount ?? 0) > 0
  const hasImportedTransactions = (importResult?.insertedCount ?? 0) > 0
  const isUnsupportedCsvResult =
    importResult?.files.some((file) => file.adapterId === 'unsupported-csv-v1') ?? false
  const importResultTitle = !importResult
    ? ''
    : hasImportedTransactions
      ? hasImportFailures
        ? 'Import finished with warnings'
        : 'Import complete'
      : 'No transactions imported'
  const importResultDescription = !importResult
    ? ''
    : isUnsupportedCsvResult
      ? 'This CSV format is not supported yet. Check that the file uses columns: date, description, amount, currency.'
      : hasImportedTransactions
        ? 'Review safe import totals below. Duplicate transactions were skipped.'
        : 'No transactions were written to the project. Review failed row counts before trying again.'
  const importResultAlertColor = hasImportedTransactions && !hasImportFailures ? 'green' : 'yellow'

  return (
    <>
      <Modal
        centered
        opened={isClearHistoryModalOpen}
        title="Clear import history?"
        onClose={() => setIsClearHistoryModalOpen(false)}
      >
        <Stack gap="md">
          <Text size="sm">
            This removes saved import batch records for the active project. Imported
            transactions stay in the local database.
          </Text>
          <Group justify="flex-end">
            <Button
              disabled={isClearingImportHistory}
              variant="default"
              onClick={() => setIsClearHistoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={isClearingImportHistory}
              onClick={() => void handleClearImportHistory()}
            >
              Clear history
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Group align="flex-start" justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              CSV Import
            </Text>
            <Title order={3}>Select CSV files</Title>
          </Stack>
          <Button loading={isSelecting} disabled={isImporting} onClick={handleSelectCsvFiles}>
            Select CSV files
          </Button>
        </Group>

        <Text c="dimmed">
          Choose one or more local bank CSV exports. Fintory imports them locally and
          shows only safe summary details in the renderer.
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
              <Group align="flex-start" justify="space-between">
                <Stack gap={4}>
                  <Text fw={700}>Selected files ({selectedFiles.length})</Text>
                  <Text c="dimmed" size="sm">
                    Importing reads file contents in the Electron main process and stores
                    normalized transactions in the active local project.
                  </Text>
                </Stack>
                <Button
                  disabled={!canImportSelectedFiles}
                  loading={isImporting}
                  onClick={() => void handleImportCsvFiles()}
                >
                  Import selected files
                </Button>
              </Group>
              <List spacing="xs">{selectedFileItems}</List>
            </Stack>
          </Card>
        ) : (
          <Card bg="blue-light" padding="lg" radius="md" withBorder>
            <Stack gap={4}>
              <Text fw={700}>No CSV files selected.</Text>
              <Text c="dimmed" size="sm">
                Select files to import transactions into the active local project.
              </Text>
            </Stack>
          </Card>
        )}

        {csvImportState.status === 'error' ? (
          <Alert color="yellow" title="CSV import unavailable">
            {csvImportState.message}
          </Alert>
        ) : null}

        {csvImportState.status === 'importing' ? (
          <Alert title="Importing CSV files">
            <Group gap="sm">
              <Loader size="sm" />
              <Text size="sm">
                Parsing selected files and writing transactions to the active local project...
              </Text>
            </Group>
          </Alert>
        ) : null}

        {importResult ? (
          <Card padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Alert color={importResultAlertColor} title={importResultTitle}>
                {importResultDescription}
              </Alert>

              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Card bg="green-light" padding="md" radius="md" withBorder>
                  <Text c="dimmed" size="xs" tt="uppercase">
                    Inserted
                  </Text>
                  <Text fw={700} size="xl">
                    {importResult.insertedCount}
                  </Text>
                </Card>
                <Card bg="blue-light" padding="md" radius="md" withBorder>
                  <Text c="dimmed" size="xs" tt="uppercase">
                    Duplicates
                  </Text>
                  <Text fw={700} size="xl">
                    {importResult.duplicateCount}
                  </Text>
                </Card>
                <Card bg="yellow-light" padding="md" radius="md" withBorder>
                  <Text c="dimmed" size="xs" tt="uppercase">
                    Failed
                  </Text>
                  <Text fw={700} size="xl">
                    {importResult.failedCount}
                  </Text>
                </Card>
                <Card bg="gray-light" padding="md" radius="md" withBorder>
                  <Text c="dimmed" size="xs" tt="uppercase">
                    Rows
                  </Text>
                  <Text fw={700} size="xl">
                    {importResult.rowCount}
                  </Text>
                </Card>
              </SimpleGrid>

              <Table.ScrollContainer minWidth={760}>
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>File</Table.Th>
                      <Table.Th>Adapter</Table.Th>
                      <Table.Th>Rows</Table.Th>
                      <Table.Th>Inserted</Table.Th>
                      <Table.Th>Duplicates</Table.Th>
                      <Table.Th>Failed</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{importResultFileRows}</Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {importDiagnosticItems.length > 0 ? (
                <Alert color="yellow" title="Import diagnostics">
                  <Stack gap="xs">
                    <Text size="sm">
                      Review these safe summaries to understand failed rows. Raw CSV
                      contents and local file paths are not shown.
                    </Text>
                    <List size="sm" spacing="xs">
                      {importDiagnosticItems}
                    </List>
                  </Stack>
                </Alert>
              ) : null}
            </Stack>
          </Card>
        ) : null}

        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group align="flex-start" justify="space-between">
              <Stack gap={4}>
                <Text fw={700}>Import history</Text>
                <Text c="dimmed" size="sm">
                  Review CSV import batches already stored in the active local project.
                </Text>
              </Stack>
              <Group>
                <Button
                  disabled={isClearingImportHistory}
                  loading={isImportHistoryLoading}
                  variant="light"
                  onClick={() => void loadImportBatches()}
                >
                  Refresh history
                </Button>
                <Button
                  color="red"
                  disabled={!canClearImportHistory}
                  loading={isClearingImportHistory}
                  variant="light"
                  onClick={() => setIsClearHistoryModalOpen(true)}
                >
                  Clear history
                </Button>
              </Group>
            </Group>

            {clearImportHistoryState.status === 'success' ? (
              <Alert color="green" title="Import history cleared">
                Removed {clearImportHistoryState.clearedCount} import batch record(s).
                Imported transactions were preserved.
              </Alert>
            ) : null}

            {clearImportHistoryState.status === 'error' ? (
              <Alert color="yellow" title="Import history not cleared">
                {clearImportHistoryState.message}
              </Alert>
            ) : null}

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
                    Imported CSV files will appear here after they are written to the
                    active local project.
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
    </>
  )
}
