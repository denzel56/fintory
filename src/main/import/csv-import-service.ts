import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type {
  CsvMappingProfileDto,
  ImportCsvFileSummaryDto,
  ImportCsvFileWithMappingInput,
  ImportCsvFilesResult,
  ImportDiagnosticDto,
  PreviewCsvColumnDto,
  PreviewCsvFileResult,
} from '../../shared/types/import.js'
import { createCsvMappingProfilesRepository } from '../db/repositories/csv-mapping-profiles-repository.js'
import type { CsvMappingProfileRecord } from '../db/repositories/csv-mapping-profiles-repository.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { createTransactionsRepository } from '../db/repositories/transactions-repository.js'
import { runInTransaction } from '../db/transactions.js'
import { parseCsvText } from './csv-parser.js'
import { createTransactionSourceHashes } from './source-hash.js'
import type { TransactionSourceHash } from './source-hash.js'
import type { TransactionDraft } from './transaction-draft.js'
import { genericCsvImportAdapter } from './adapters/generic-csv-import-adapter.js'
import { userStatementCsvImportAdapter } from './adapters/user-statement-csv-import-adapter.js'
import type { CsvImportAdapter, CsvImportAdapterError } from './adapters/csv-import-adapter.js'
import {
  manualCsvMappingAdapterId,
  normalizeRowsWithManualMapping,
} from './adapters/manual-csv-mapping-adapter.js'
import type { CsvParseError, CsvParseResult } from './csv-parser.js'

export type CsvImportFileInput = {
  readonly filePath: string
}

export type CsvPreviewFileInput = CsvImportFileInput & {
  readonly database?: DatabaseSync
}

export type ImportCsvFilesInput = {
  readonly database: DatabaseSync
  readonly files: readonly CsvImportFileInput[]
}

const csvImportAdapters: readonly CsvImportAdapter[] = [
  userStatementCsvImportAdapter,
  genericCsvImportAdapter,
]
const unsupportedAdapterId = 'unsupported-csv-v1'

type ImportCsvFailureCode = Extract<ImportCsvFilesResult, { readonly ok: false }>['code']

class CsvImportServiceError extends Error {
  readonly code: ImportCsvFailureCode

  constructor(code: ImportCsvFailureCode, message: string) {
    super(message)
    this.code = code
  }
}

const toImportFailureResult = (
  error: unknown,
  fallbackMessage: string,
): Extract<ImportCsvFilesResult, { readonly ok: false }> => {
  if (error instanceof CsvImportServiceError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    }
  }

  return {
    ok: false,
    code: 'csv-import-failed',
    message: fallbackMessage,
  }
}

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

const getPreviewColumns = (parseResult: CsvParseResult): readonly PreviewCsvColumnDto[] => {
  return parseResult.headers.map((header) => ({
    header,
    nonEmptyCount: parseResult.rows.filter((row) => (row.values[header] ?? '').trim().length > 0)
      .length,
  }))
}

const toCsvMappingProfileDto = (profile: CsvMappingProfileRecord): CsvMappingProfileDto => ({
  createdAt: profile.createdAt,
  headerFingerprint: profile.headerFingerprint,
  headers: profile.headers,
  id: profile.id,
  mapping: profile.mapping,
  name: profile.name,
  updatedAt: profile.updatedAt,
})

const findDetectedMappingProfiles = (
  database: DatabaseSync | undefined,
  headers: readonly string[],
): readonly CsvMappingProfileDto[] => {
  if (!database) {
    return []
  }

  try {
    return createCsvMappingProfilesRepository(database)
      .findByHeaders(headers)
      .map(toCsvMappingProfileDto)
  } catch {
    return []
  }
}

const diagnosticRowNumberLimit = 10

const normalizeHeaderName = (header: string): string => header.trim().toLowerCase()

const getMissingRequiredColumnErrors = (
  adapter: CsvImportAdapter,
  headers: readonly string[],
): readonly CsvImportAdapterError[] => {
  const normalizedHeaders = new Set(headers.map(normalizeHeaderName))

  return adapter.requiredColumns
    .filter((columnName) => !normalizedHeaders.has(normalizeHeaderName(columnName)))
    .map((columnName) => ({
      code: 'missing-required-column',
      columnName,
      message: `CSV is missing the required ${columnName} column.`,
    }))
}

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

const toCsvParseImportError = (error: CsvParseError): CsvImportAdapterError => {
  if (error.code === 'empty-file') {
    return {
      code: 'empty-file',
      message: 'CSV file is empty or does not include a header row.',
      rowNumber: error.rowNumber,
    }
  }

  return {
    code: error.rowNumber === 1 ? 'malformed-csv-header' : 'malformed-csv-row',
    message: error.message,
    rowNumber: error.rowNumber,
  }
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

const createImportBatchFromAdapterResult = (input: {
  readonly adapterId: string
  readonly database: DatabaseSync
  readonly diagnostics: readonly ImportDiagnosticDto[]
  readonly draftItems: readonly TransactionSourceHash[]
  readonly failedCount: number
  readonly fileName: string
  readonly rowCount: number
  readonly sourceFileHash: string
}): ImportCsvFileSummaryDto => {
  const batchId = randomUUID()
  const importedAt = new Date().toISOString()
  const importBatchesRepository = createImportBatchesRepository(input.database)
  const transactionsRepository = createTransactionsRepository(input.database)
  let insertedCount = 0

  importBatchesRepository.insert({
    adapterId: input.adapterId,
    duplicateCount: 0,
    failedCount: input.failedCount,
    id: batchId,
    importedAt,
    insertedCount: 0,
    rowCount: input.rowCount,
    sourceFileHash: input.sourceFileHash,
    sourceFileName: input.fileName,
  })

  for (const item of input.draftItems) {
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

  const duplicateCount = input.draftItems.length - insertedCount

  importBatchesRepository.updateCounts({
    duplicateCount,
    failedCount: input.failedCount,
    id: batchId,
    insertedCount,
    rowCount: input.rowCount,
  })

  return {
    adapterId: input.adapterId,
    diagnostics: input.diagnostics,
    duplicateCount,
    failedCount: input.failedCount,
    fileName: input.fileName,
    insertedCount,
    rowCount: input.rowCount,
  }
}

type PreparedParsedCsvImport = {
  readonly adapterId: string
  readonly diagnostics: readonly ImportDiagnosticDto[]
  readonly draftItems: readonly TransactionSourceHash[]
  readonly failedCount: number
  readonly fileName: string
  readonly rowCount: number
  readonly sourceFileHash: string
}

const prepareParsedCsvImport = (input: {
  readonly adapterId: string
  readonly adapterResult: {
    readonly drafts: readonly TransactionDraft[]
    readonly errors: readonly CsvImportAdapterError[]
  }
  readonly fileName: string
  readonly sourceHashAdapterId?: string
  readonly sourceFileHash: string
}): PreparedParsedCsvImport => {
  const failedCount = getFailedRowCount(input.adapterResult.errors)
  const diagnostics = toImportDiagnostics(input.adapterResult.errors)
  const rowCount = getImportRowCount({
    draftCount: input.adapterResult.drafts.length,
    failedCount,
  })

  return {
    adapterId: input.adapterId,
    diagnostics,
    draftItems:
      input.adapterResult.drafts.length > 0
        ? createTransactionSourceHashes(
            input.sourceHashAdapterId ?? input.adapterId,
            input.adapterResult.drafts,
          )
        : [],
    failedCount,
    fileName: input.fileName,
    rowCount,
    sourceFileHash: input.sourceFileHash,
  }
}

const writePreparedParsedCsvImport = (
  database: DatabaseSync,
  preparedImport: PreparedParsedCsvImport,
): ImportCsvFileSummaryDto => {
  if (preparedImport.draftItems.length === 0) {
    return createFailedBatch({
      adapterId: preparedImport.adapterId,
      database,
      diagnostics: preparedImport.diagnostics,
      failedCount: preparedImport.failedCount,
      fileName: preparedImport.fileName,
      rowCount: preparedImport.rowCount,
      sourceFileHash: preparedImport.sourceFileHash,
    })
  }

  return createImportBatchFromAdapterResult({
    adapterId: preparedImport.adapterId,
    database,
    diagnostics: preparedImport.diagnostics,
    draftItems: preparedImport.draftItems,
    failedCount: preparedImport.failedCount,
    fileName: preparedImport.fileName,
    rowCount: preparedImport.rowCount,
    sourceFileHash: preparedImport.sourceFileHash,
  })
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

  if (adapter) {
    const adapterResult = adapter.normalizeRows(parseResult)
    const preparedImport = prepareParsedCsvImport({
      adapterId: adapter.id,
      adapterResult,
      fileName,
      sourceFileHash,
    })

    try {
      return runInTransaction(database, () =>
        writePreparedParsedCsvImport(database, preparedImport),
      )
    } catch {
      throw new CsvImportServiceError(
        'csv-import-write-failed',
        'CSV import could not be written to the project database. Try again or reopen the project.',
      )
    }
  }

  const failedCount = Math.max(
    1,
    parseResult.rows.length + getFailedRowCount(parseResult.errors),
  )
  const missingRequiredColumnErrors = csvImportAdapters.flatMap((candidateAdapter) =>
    getMissingRequiredColumnErrors(candidateAdapter, parseResult.headers),
  )
  const diagnostics: readonly ImportDiagnosticDto[] = [
    {
      code: 'unsupported-csv-format',
      count: 1,
      message:
        'CSV format is not supported yet. Expected columns include date, description, amount, and currency.',
      rowNumbers: [],
    },
    ...toImportDiagnostics(missingRequiredColumnErrors),
    ...toImportDiagnostics(parseResult.errors.map(toCsvParseImportError)),
  ]

  try {
    return runInTransaction(database, () =>
      createFailedBatch({
        adapterId: unsupportedAdapterId,
        database,
        diagnostics,
        failedCount,
        fileName,
        rowCount: failedCount,
        sourceFileHash,
      }),
    )
  } catch {
    throw new CsvImportServiceError(
      'csv-import-write-failed',
      'CSV import could not be written to the project database. Try again or reopen the project.',
    )
  }
}

export const previewCsvFile = async (file: CsvPreviewFileInput): Promise<PreviewCsvFileResult> => {
  try {
    const fileContent = await readFile(file.filePath)
    const parseResult = parseCsvText(fileContent.toString('utf8'), { encoding: 'utf8' })
    const adapter = getImportAdapter(parseResult.headers)

    return {
      ok: true,
      columns: getPreviewColumns(parseResult),
      detectedAdapterId: adapter?.id ?? null,
      detectedMappingProfiles: findDetectedMappingProfiles(file.database, parseResult.headers),
      fileName: basename(file.filePath),
      headers: parseResult.headers,
      rowCount: parseResult.rows.length + getFailedRowCount(parseResult.errors),
    }
  } catch {
    return {
      ok: false,
      code: 'csv-preview-failed',
      message: 'CSV file could not be previewed right now.',
    }
  }
}

export const importCsvFileWithMapping = async ({
  database,
  filePath,
  mapping,
}: {
  readonly database: DatabaseSync
  readonly filePath: string
  readonly mapping: ImportCsvFileWithMappingInput['mapping']
}): Promise<ImportCsvFilesResult> => {
  try {
    const fileContent = await readFile(filePath)
    const sourceFileHash = getFileHash(fileContent)
    const fileName = basename(filePath)
    const parseResult: CsvParseResult = parseCsvText(fileContent.toString('utf8'), { encoding: 'utf8' })
    const adapterResult = normalizeRowsWithManualMapping(parseResult, mapping)
    const preparedImport = prepareParsedCsvImport({
      adapterId: manualCsvMappingAdapterId,
      adapterResult,
      fileName,
      sourceHashAdapterId: genericCsvImportAdapter.id,
      sourceFileHash,
    })

    const summary = (() => {
      try {
        return runInTransaction(database, () =>
          writePreparedParsedCsvImport(database, preparedImport),
        )
      } catch {
        throw new CsvImportServiceError(
          'csv-import-write-failed',
          'CSV import could not be written to the project database. Try again or reopen the project.',
        )
      }
    })()

    return {
      ok: true,
      files: [summary],
      ...toTotalSummary([summary]),
    }
  } catch (error) {
    return toImportFailureResult(
      error,
      'CSV file could not be imported with the selected mapping right now.',
    )
  }
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
  } catch (error) {
    return toImportFailureResult(error, 'CSV files could not be imported right now.')
  }
}
