import { DatabaseSync } from 'node:sqlite'
import {
  readProjectDatabaseMigrationState,
  runProjectDatabaseMigrations,
} from './migrations/project-database-migrations.js'
import { createCategoriesRepository } from './repositories/categories-repository.js'
import { createImportBatchesRepository } from './repositories/import-batches-repository.js'
import { createProjectMetaRepository } from './repositories/project-meta-repository.js'
import { createTransactionsRepository } from './repositories/transactions-repository.js'
import { runInTransaction } from './transactions.js'

export type SqliteSmokeResult = {
  readonly appliedMigrationCount: number
  readonly coreSchemaIndexCount: number
  readonly coreSchemaRowCount: number
  readonly coreSchemaTableCount: number
  readonly insertedName: string
  readonly migrationVersion: number
  readonly repositorySmokePassed: boolean
  readonly sqliteVersion: string
  readonly transactionRollbackPassed: boolean
}

const expectedCoreSchemaTables = [
  'categories',
  'import_batches',
  'project_meta',
  'transactions',
] as const

const expectedCoreSchemaIndexes = [
  'idx_import_batches_source_file_hash',
  'idx_transactions_category_id',
  'idx_transactions_direction',
  'idx_transactions_import_batch_id',
  'idx_transactions_source_hash',
  'idx_transactions_transaction_date',
] as const

const expectedCoreSchemaColumns: Record<(typeof expectedCoreSchemaTables)[number], readonly string[]> = {
  categories: ['id', 'name', 'color', 'created_at', 'updated_at'],
  import_batches: [
    'id',
    'source_file_name',
    'source_file_hash',
    'adapter_id',
    'imported_at',
    'row_count',
    'inserted_count',
    'duplicate_count',
    'failed_count',
  ],
  project_meta: ['id', 'name', 'created_at', 'updated_at', 'schema_version'],
  transactions: [
    'id',
    'transaction_date',
    'description',
    'merchant',
    'amount_minor',
    'currency',
    'direction',
    'category_id',
    'source_hash',
    'import_batch_id',
    'raw_description',
    'created_at',
    'updated_at',
  ],
}

const getSchemaObjectNames = (database: DatabaseSync, type: 'index' | 'table'): Set<string> => {
  const rows = database
    .prepare("SELECT name FROM sqlite_schema WHERE type = ? AND name NOT LIKE 'sqlite_%'")
    .all(type) as Array<{ name: string }>

  return new Set(rows.map((row) => row.name))
}

const getTableColumnType = (
  database: DatabaseSync,
  tableName: string,
  columnName: string,
): string | null => {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string
    type: string
  }>
  const column = rows.find((row) => row.name === columnName)

  return column?.type ?? null
}

const getTableColumnNames = (database: DatabaseSync, tableName: string): Set<string> => {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string
  }>

  return new Set(rows.map((row) => row.name))
}

const hasExpectedCoreSchemaColumns = (database: DatabaseSync): boolean => {
  return expectedCoreSchemaTables.every((tableName) => {
    const actualColumnNames = getTableColumnNames(database, tableName)
    const expectedColumnNames = expectedCoreSchemaColumns[tableName]

    return expectedColumnNames.every((columnName) => actualColumnNames.has(columnName))
  })
}

const getCoreSchemaRowCount = (database: DatabaseSync): number => {
  return expectedCoreSchemaTables.reduce((rowCount, tableName) => {
    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as
      | { count: number }
      | undefined

    return rowCount + (row?.count ?? 0)
  }, 0)
}

const runRepositorySmokeCheck = (database: DatabaseSync): boolean => {
  const categoriesRepository = createCategoriesRepository(database)
  const importBatchesRepository = createImportBatchesRepository(database)
  const projectMetaRepository = createProjectMetaRepository(database)
  const transactionsRepository = createTransactionsRepository(database)

  return (
    categoriesRepository.count() === 0 &&
    categoriesRepository.list().length === 0 &&
    categoriesRepository.findById('missing-category') === null &&
    importBatchesRepository.count() === 0 &&
    importBatchesRepository.findById('missing-import-batch') === null &&
    projectMetaRepository.count() === 0 &&
    projectMetaRepository.findById('missing-project-meta') === null &&
    transactionsRepository.count() === 0 &&
    transactionsRepository.findById('missing-transaction') === null
  )
}

const runTransactionRollbackSmokeCheck = (database: DatabaseSync): boolean => {
  try {
    runInTransaction(database, () => {
      database
        .prepare(
          `INSERT INTO categories (id, name, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run('rollback-category', 'Rollback category', '#868e96', '2026-01-01', '2026-01-01')

      throw new Error('Trigger rollback')
    })
  } catch {
    const categoriesRepository = createCategoriesRepository(database)

    return categoriesRepository.findById('rollback-category') === null
  }

  return false
}

export function runSqliteSmokeCheck(): SqliteSmokeResult {
  const database = new DatabaseSync(':memory:')

  try {
    database.exec('PRAGMA foreign_keys = ON')
    database.exec(`
      CREATE TABLE smoke_check (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `)

    database.prepare('INSERT INTO smoke_check (name) VALUES (?)').run('fintory')

    const insertedRow = database
      .prepare('SELECT name FROM smoke_check WHERE id = ?')
      .get(1) as { name: string } | undefined
    const versionRow = database
      .prepare('SELECT sqlite_version() AS sqliteVersion')
      .get() as { sqliteVersion: string } | undefined
    runProjectDatabaseMigrations(database)
    runProjectDatabaseMigrations(database)
    const migrationState = readProjectDatabaseMigrationState(database)
    const schemaTables = getSchemaObjectNames(database, 'table')
    const schemaIndexes = getSchemaObjectNames(database, 'index')
    const hasExpectedTables = expectedCoreSchemaTables.every((tableName) =>
      schemaTables.has(tableName),
    )
    const hasExpectedIndexes = expectedCoreSchemaIndexes.every((indexName) =>
      schemaIndexes.has(indexName),
    )
    const hasExpectedColumns = hasExpectedCoreSchemaColumns(database)
    const amountMinorColumnType = getTableColumnType(database, 'transactions', 'amount_minor')
    const coreSchemaRowCount = getCoreSchemaRowCount(database)
    const repositorySmokePassed = runRepositorySmokeCheck(database)
    const transactionRollbackPassed = runTransactionRollbackSmokeCheck(database)

    if (!insertedRow || !versionRow) {
      throw new Error('SQLite smoke check did not return expected rows.')
    }

    if (
      !hasExpectedTables ||
      !hasExpectedIndexes ||
      !hasExpectedColumns ||
      amountMinorColumnType !== 'INTEGER'
    ) {
      throw new Error('SQLite core schema smoke check did not return expected schema.')
    }

    if (!repositorySmokePassed || !transactionRollbackPassed) {
      throw new Error('SQLite repository smoke check did not return expected results.')
    }

    return {
      appliedMigrationCount: migrationState.appliedMigrationCount,
      coreSchemaIndexCount: expectedCoreSchemaIndexes.length,
      coreSchemaRowCount,
      coreSchemaTableCount: expectedCoreSchemaTables.length,
      insertedName: insertedRow.name,
      migrationVersion: migrationState.currentVersion,
      repositorySmokePassed,
      sqliteVersion: versionRow.sqliteVersion,
      transactionRollbackPassed,
    }
  } finally {
    database.close()
  }
}
