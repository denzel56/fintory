import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type {
  ImportCsvFileSummaryDto,
  ImportCsvFilesResult,
  ImportDiagnosticDto,
} from '../../shared/types/import.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { createTransactionsRepository } from '../db/repositories/transactions-repository.js'
import { runInTransaction } from '../db/transactions.js'
import { parseCsvText } from './csv-parser.js'
import { createTransactionSourceHashes } from './source-hash.js'
import { genericCsvImportAdapter } from './adapters/generic-csv-import-adapter.js'
import type { CsvImportAdapter, CsvImportAdapterError } from './adapters/csv-import-adapter.js'

export type CsvImportFileInput = {
  readonly filePath: string
}

export type ImportCsvFilesInput = {
  readonly database: DatabaseSync
  readonly files: readonly CsvImportFileInput[]
}

const csvImportAdapters: readonly CsvImportAdapter[] = [genericCsvImportAdapter]
const unsupportedAdapterId = 'unsupported-csv-v1'

const getFileHash = (content: Buffer): string =>
  `sha256:${createHash('sha256').update(content).digest('hex')}`

const getImportRowCount = (summary: {
  readonly draftCount: number
  readonly failedCount: number
}): number => summary.draftCount + summary.failedCount

const getFailedRowCount = (errors: readonly { readonly rowNumber?: number }[]): number => {
  const failedRowNumbers = new Set<number>()
  let errorsWithoutRowNumber = 0

  for (const error of errors) {
    if (typeof error.rowNumber === 'number') {
      failedRowNumbers.add(error.rowNumber)
    } else {
      errorsWithoutRowNumber += 1
    }
  }

  return failedRowNumbers.size + errorsWithoutRowNumber
}

const getImportAdapter = (headers: readonly string[]): CsvImportAdapter | null =>
  csvImportAdapters.find((adapter) => adapter.canHandle(headers)) ?? null

const diagnosticRowNumberLimit = 10

const getDiagnosticKey = (error: CsvImportAdapterError): string => {
  return `${error.code}:${error.columnName ?? ''}:${error.message}`
}

const toImportDiagnostics = (
  errors: readonly CsvImportAdapterError[],
): readonly ImportDiagnosticDto[] => {
  const diagnosticsByKey = new Map<string, ImportDiagnosticDto>()

  for (const error of errors) {
    const key = getDiagnosticKey(error)
    const existingDiagnostic = diagnosticsByKey.get(key)
    const rowNumbers =
      typeof error.rowNumber === 'number'
        ? [
            ...new Set([
              ...(existingDiagnostic?.rowNumbers ?? []),
              error.rowNumber,
            ]),
          ].slice(0, diagnosticRowNumberLimit)
        : (existingDiagnostic?.rowNumbers ?? [])

    diagnosticsByKey.set(key, {
      code: error.code,
      columnName: error.columnName,
      count: (existingDiagnostic?.count ?? 0) + 1,
      message: error.message,
      rowNumbers,
    })
  }

  return [...diagnosticsByKey.values()]
}

const toTotalSummary = (
  files: readonly ImportCsvFileSummaryDto[],
): Omit<Extract<ImportCsvFilesResult, { ok: true }>, 'ok' | 'files'> => ({
  duplicateCount: files.reduce((total, file) => total + file.duplicateCount, 0),
  failedCount: files.reduce((total, file) => total + file.failedCount, 0),
  insertedCount: files.reduce((total, file) => total + file.insertedCount, 0),
  rowCount: files.reduce((total, file) => total + file.rowCount, 0),
})

const createFailedBatch = (input: {
  readonly adapterId: string
  readonly database: DatabaseSync
  readonly diagnostics: readonly ImportDiagnosticDto[]
  readonly failedCount: number
  readonly fileName: string
  readonly rowCount: number
  readonly sourceFileHash: string
}): ImportCsvFileSummaryDto => {
  const batchId = randomUUID()
  const importBatchesRepository = createImportBatchesRepository(input.database)

  importBatchesRepository.insert({
    adapterId: input.adapterId,
    duplicateCount: 0,
    failedCount: input.failedCount,
    id: batchId,
    importedAt: new Date().toISOString(),
    insertedCount: 0,
    rowCount: input.rowCount,
    sourceFileHash: input.sourceFileHash,
    sourceFileName: input.fileName,
  })

  return {
    adapterId: input.adapterId,
    diagnostics: input.diagnostics,
    duplicateCount: 0,
    failedCount: input.failedCount,
    fileName: input.fileName,
    insertedCount: 0,
    rowCount: input.rowCount,
  }
}

const importCsvFile = async (
  database: DatabaseSync,
  file: CsvImportFileInput,
): Promise<ImportCsvFileSummaryDto> => {
  const fileContent = await readFile(file.filePath)
  const csvText = fileContent.toString('utf8')
  const sourceFileHash = getFileHash(fileContent)
  const fileName = basename(file.filePath)
  const parseResult = parseCsvText(csvText, { encoding: 'utf8' })
  const adapter = getImportAdapter(parseResult.headers)

  return runInTransaction(database, () => {
    if (!adapter) {
      const failedCount = Math.max(
        1,
        parseResult.rows.length + getFailedRowCount(parseResult.errors),
      )
      const diagnostics: readonly ImportDiagnosticDto[] = [
        {
          code: 'unsupported-csv-format',
          count: 1,
          message:
            'CSV format is not supported yet. Expected columns include date, description, amount, and currency.',
          rowNumbers: [],
        },
        ...toImportDiagnostics(parseResult.errors.map((error) => ({
          code: error.rowNumber === 1 ? 'malformed-csv-header' : 'malformed-csv-row',
          message: error.message,
          rowNumber: error.rowNumber,
        }))),
      ]

      return createFailedBatch({
        adapterId: unsupportedAdapterId,
        database,
        diagnostics,
        failedCount,
        fileName,
        rowCount: failedCount,
        sourceFileHash,
      })
    }

    const adapterResult = adapter.normalizeRows(parseResult)
    const failedCount = getFailedRowCount(adapterResult.errors)
    const diagnostics = toImportDiagnostics(adapterResult.errors)
    const rowCount = getImportRowCount({
      draftCount: adapterResult.drafts.length,
      failedCount,
    })

    if (adapterResult.drafts.length === 0) {
      return createFailedBatch({
        adapterId: adapter.id,
        database,
        diagnostics,
        failedCount,
        fileName,
        rowCount,
        sourceFileHash,
      })
    }

    const batchId = randomUUID()
    const importedAt = new Date().toISOString()
    const importBatchesRepository = createImportBatchesRepository(database)
    const transactionsRepository = createTransactionsRepository(database)
    let insertedCount = 0

    importBatchesRepository.insert({
      adapterId: adapter.id,
      duplicateCount: 0,
      failedCount,
      id: batchId,
      importedAt,
      insertedCount: 0,
      rowCount,
      sourceFileHash,
      sourceFileName: fileName,
    })

    for (const item of createTransactionSourceHashes(adapter.id, adapterResult.drafts)) {
      const wasInserted = transactionsRepository.insertIfSourceHashIsNew({
        amountMinor: item.draft.amountMinor,
        categoryId: null,
        createdAt: importedAt,
        currency: item.draft.currency,
        description: item.draft.description,
        direction: item.draft.direction,
        id: randomUUID(),
        importBatchId: batchId,
        merchant: item.draft.merchant,
        rawDescription: item.draft.rawDescription,
        sourceHash: item.sourceHash,
        transactionDate: item.draft.transactionDate,
        updatedAt: importedAt,
      })

      if (wasInserted) {
        insertedCount += 1
      }
    }

    const duplicateCount = adapterResult.drafts.length - insertedCount

    importBatchesRepository.updateCounts({
      duplicateCount,
      failedCount,
      id: batchId,
      insertedCount,
      rowCount,
    })

    return {
      adapterId: adapter.id,
      diagnostics,
      duplicateCount,
      failedCount,
      fileName,
      insertedCount,
      rowCount,
    }
  })
}

export const importCsvFiles = async ({
  database,
  files,
}: ImportCsvFilesInput): Promise<ImportCsvFilesResult> => {
  try {
    const summaries: ImportCsvFileSummaryDto[] = []

    for (const file of files) {
      summaries.push(await importCsvFile(database, file))
    }

    return {
      ok: true,
      files: summaries,
      ...toTotalSummary(summaries),
    }
  } catch {
    return {
      ok: false,
      code: 'csv-import-failed',
      message: 'CSV files could not be imported right now.',
    }
  }
}
