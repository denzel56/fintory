import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { runProjectDatabaseMigrations } from '../db/migrations/project-database-migrations.js'
import { createImportBatchesRepository } from '../db/repositories/import-batches-repository.js'
import { createTransactionsRepository } from '../db/repositories/transactions-repository.js'
import { importCsvFileWithMapping, importCsvFiles, previewCsvFile } from './csv-import-service.js'

export type CsvImportSmokeResult = {
  readonly importBatchCount: number
  readonly firstImportDuplicateCount: number
  readonly firstImportFailedCount: number
  readonly firstImportInsertedCount: number
  readonly manualImportDuplicateCount: number
  readonly manualImportFailedCount: number
  readonly manualImportInsertedCount: number
  readonly manualPreviewDescriptionNonEmptyCount: number
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
        '04.07.2026,Manual salary,1000.00,USD',
      ].join('\n'),
      { encoding: 'utf8' },
    )

    database.exec('PRAGMA foreign_keys = ON')
    runProjectDatabaseMigrations(database)

    const firstImport = await importCsvFiles({ database, files: [{ filePath: csvFilePath }] })
    const secondImport = await importCsvFiles({ database, files: [{ filePath: csvFilePath }] })
    const manualPreview = await previewCsvFile({ filePath: manualCsvFilePath })
    const manualImport = await importCsvFileWithMapping({
      database,
      filePath: manualCsvFilePath,
      mapping: {
        amountColumn: 'total',
        currencyColumn: 'ccy',
        dateColumn: 'posted',
        dateFormat: 'dd.mm.yyyy',
        descriptionColumn: 'memo',
      },
    })

    if (!firstImport.ok || !secondImport.ok || !manualPreview.ok || !manualImport.ok) {
      throw new Error('CSV import smoke check could not import sample CSV.')
    }

    return {
      firstImportDuplicateCount: firstImport.duplicateCount,
      firstImportFailedCount: firstImport.failedCount,
      firstImportInsertedCount: firstImport.insertedCount,
      importBatchCount: createImportBatchesRepository(database).count(),
      manualImportDuplicateCount: manualImport.duplicateCount,
      manualImportFailedCount: manualImport.failedCount,
      manualImportInsertedCount: manualImport.insertedCount,
      manualPreviewDescriptionNonEmptyCount:
        manualPreview.columns.find((column) => column.header === 'memo')?.nonEmptyCount ?? 0,
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
