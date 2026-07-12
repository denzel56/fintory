import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { runProjectDatabaseMigrations } from '../db/migrations/project-database-migrations.js'
import { createCsvMappingProfilesRepository } from '../db/repositories/csv-mapping-profiles-repository.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { createTransactionsRepository } from '../db/repositories/transactions-repository.js'
import { importCsvFileWithMapping, importCsvFiles, previewCsvFile } from './csv-import-service.js'

export type CsvImportSmokeResult = {
  readonly importBatchCount: number
  readonly firstImportDuplicateCount: number
  readonly firstImportFailedCount: number
  readonly firstImportInsertedCount: number
  readonly genericManualImportDuplicateCount: number
  readonly genericManualImportFailedCount: number
  readonly genericManualImportInsertedCount: number
  readonly manualImportDuplicateCount: number
  readonly manualImportFailedCount: number
  readonly manualImportInsertedCount: number
  readonly manualPreviewDescriptionNonEmptyCount: number
  readonly manualPreviewDetectedMappingProfileCount: number
  readonly manualPreviewHeaderCount: number
  readonly secondImportDuplicateCount: number
  readonly secondImportFailedCount: number
  readonly secondImportInsertedCount: number
  readonly transactionCount: number
}

export const runCsvImportSmokeCheck = async (): Promise<CsvImportSmokeResult> => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'fintory-csv-import-smoke-'))
  const csvFilePath = join(tempDirectory, 'sample.csv')
  const manualCsvFilePath = join(tempDirectory, 'manual-sample.csv')
  const database = new DatabaseSync(':memory:')

  try {
    await writeFile(
      csvFilePath,
      [
        'date,description,amount,currency',
        '2026-07-01,Coffee,-12.50,USD',
        '2026-07-01,Coffee,-12.50,USD',
        '2026-07-02,Invalid amount,not-a-number,USD',
      ].join('\n'),
      { encoding: 'utf8' },
    )
    await writeFile(
      manualCsvFilePath,
      [
        'posted,memo,total,ccy',
        '03.07.2026,Manual coffee,-10.25,USD',
        '04.07.2026,Manual salary,1000.00,',
      ].join('\n'),
      { encoding: 'utf8' },
    )

    database.exec('PRAGMA foreign_keys = ON')
    runProjectDatabaseMigrations(database)

    const firstImport = await importCsvFiles({ database, files: [{ filePath: csvFilePath }] })
    const secondImport = await importCsvFiles({ database, files: [{ filePath: csvFilePath }] })
    const genericManualImport = await importCsvFileWithMapping({
      database,
      filePath: csvFilePath,
      mapping: {
        amountColumn: 'amount',
        currencyColumn: 'currency',
        dateColumn: 'date',
        descriptionColumn: 'description',
      },
    })
    createCsvMappingProfilesRepository(database).create({
      createdAt: '2026-07-12T00:00:00.000Z',
      headers: ['posted', 'memo', 'total', 'ccy'],
      id: 'csv-import-smoke-mapping-profile',
      mapping: {
        amountColumn: 'total',
        currencyColumn: 'ccy',
        dateColumn: 'posted',
        dateFormat: 'dd.mm.yyyy',
        descriptionColumn: 'memo',
        fixedCurrency: 'USD',
      },
      name: 'Smoke test mapping',
      updatedAt: '2026-07-12T00:00:00.000Z',
    })

    const manualPreview = await previewCsvFile({ database, filePath: manualCsvFilePath })
    const manualImport = await importCsvFileWithMapping({
      database,
      filePath: manualCsvFilePath,
      mapping: {
        amountColumn: 'total',
        currencyColumn: 'ccy',
        dateColumn: 'posted',
        dateFormat: 'dd.mm.yyyy',
        descriptionColumn: 'memo',
        fixedCurrency: 'USD',
      },
    })

    if (
      !firstImport.ok ||
      !secondImport.ok ||
      !genericManualImport.ok ||
      !manualPreview.ok ||
      !manualImport.ok
    ) {
      throw new Error('CSV import smoke check could not import sample CSV.')
    }

    return {
      firstImportDuplicateCount: firstImport.duplicateCount,
      firstImportFailedCount: firstImport.failedCount,
      firstImportInsertedCount: firstImport.insertedCount,
      genericManualImportDuplicateCount: genericManualImport.duplicateCount,
      genericManualImportFailedCount: genericManualImport.failedCount,
      genericManualImportInsertedCount: genericManualImport.insertedCount,
      importBatchCount: createImportBatchesRepository(database).count(),
      manualImportDuplicateCount: manualImport.duplicateCount,
      manualImportFailedCount: manualImport.failedCount,
      manualImportInsertedCount: manualImport.insertedCount,
      manualPreviewDescriptionNonEmptyCount:
        manualPreview.columns.find((column) => column.header === 'memo')?.nonEmptyCount ?? 0,
      manualPreviewDetectedMappingProfileCount: manualPreview.detectedMappingProfiles.length,
      manualPreviewHeaderCount: manualPreview.headers.length,
      secondImportDuplicateCount: secondImport.duplicateCount,
      secondImportFailedCount: secondImport.failedCount,
      secondImportInsertedCount: secondImport.insertedCount,
      transactionCount: createTransactionsRepository(database).count(),
    }
  } finally {
    database.close()
    await rm(tempDirectory, { force: true, recursive: true })
  }
}
