import { DatabaseSync } from 'node:sqlite'
import { defaultCategoryCount, seedDefaultCategories } from './default-categories.js'
import {
  readProjectDatabaseMigrationState,
  runProjectDatabaseMigrations,
} from './migrations/project-database-migrations.js'
import { createAnalyticsRepository } from './repositories/analytics-repository.js'
import { createCategoriesRepository } from './repositories/categories-repository.js'
import { createCsvMappingProfilesRepository } from './repositories/csv-mapping-profiles-repository.js'
import { createImportBatchesRepository } from './repositories/import-batches-repository.js'
import { createProjectMetaRepository } from './repositories/project-meta-repository.js'
import { createTransactionsRepository } from './repositories/transactions-repository.js'
import { runInTransaction } from './transactions.js'

export type SqliteSmokeResult = {
  readonly appliedMigrationCount: number
  readonly analyticsSmokePassed: boolean
  readonly categoryCrudSmokePassed: boolean
  readonly coreSchemaIndexCount: number
  readonly coreSchemaRowCount: number
  readonly coreSchemaTableCount: number
  readonly csvMappingProfilesSmokePassed: boolean
  readonly insertedName: string
  readonly importHistoryClearPassed: boolean
  readonly migrationVersion: number
  readonly seededCategoryCount: number
  readonly repositorySmokePassed: boolean
  readonly sqliteVersion: string
  readonly transactionRollbackPassed: boolean
  readonly transactionSourceHashUniquePassed: boolean
}

const expectedCoreSchemaTables = [
  'categories',
  'csv_mapping_profiles',
  'import_batches',
  'project_meta',
  'transactions',
] as const

const expectedCoreSchemaIndexes = [
  'idx_import_batches_source_file_hash',
  'idx_csv_mapping_profiles_header_fingerprint',
  'idx_transactions_category_id',
  'idx_transactions_direction',
  'idx_transactions_import_batch_id',
  'idx_transactions_source_hash',
  'idx_transactions_source_hash_unique',
  'idx_transactions_transaction_date',
] as const

const expectedCoreSchemaColumns: Record<(typeof expectedCoreSchemaTables)[number], readonly string[]> = {
  categories: ['id', 'name', 'color', 'created_at', 'updated_at'],
  csv_mapping_profiles: [
    'id',
    'name',
    'header_fingerprint',
    'headers_json',
    'mapping_json',
    'created_at',
    'updated_at',
  ],
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
  const csvMappingProfilesRepository = createCsvMappingProfilesRepository(database)
  const importBatchesRepository = createImportBatchesRepository(database)
  const projectMetaRepository = createProjectMetaRepository(database)
  const transactionsRepository = createTransactionsRepository(database)

  return (
    categoriesRepository.count() === 0 &&
    categoriesRepository.list().length === 0 &&
    categoriesRepository.findById('missing-category') === null &&
    csvMappingProfilesRepository.count() === 0 &&
    csvMappingProfilesRepository.findById('missing-csv-mapping-profile') === null &&
    csvMappingProfilesRepository.findByHeaders(['posted', 'memo']).length === 0 &&
    importBatchesRepository.count() === 0 &&
    importBatchesRepository.findById('missing-import-batch') === null &&
    projectMetaRepository.count() === 0 &&
    projectMetaRepository.findById('missing-project-meta') === null &&
    transactionsRepository.count() === 0 &&
    transactionsRepository.findById('missing-transaction') === null
  )
}

const runCsvMappingProfilesSmokeCheck = (database: DatabaseSync): boolean => {
  const repository = createCsvMappingProfilesRepository(database)
  const timestamp = '2026-01-01T00:00:00.000Z'
  const headers = ['Posted', 'Memo', 'Total', 'Currency']
  const createdProfile = repository.create({
    createdAt: timestamp,
    headers,
    id: 'csv-mapping-profile-smoke',
    mapping: {
      amountColumn: 'Total',
      currencyColumn: 'Currency',
      dateColumn: 'Posted',
      dateFormat: 'dd.mm.yyyy',
      descriptionColumn: 'Memo',
      fixedCurrency: 'USD',
    },
    name: 'Smoke mapping profile',
    updatedAt: timestamp,
  })
  const foundById = repository.findById(createdProfile.id)
  const foundByHeaders = repository.findByHeaders([' posted ', 'MEMO', 'total', 'currency'])

  return (
    repository.count() === 1 &&
    repository.list().length === 1 &&
    foundById?.name === 'Smoke mapping profile' &&
    foundByHeaders.length === 1 &&
    foundByHeaders[0]?.id === createdProfile.id &&
    createdProfile.mapping.fixedCurrency === 'USD'
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

const runDefaultCategorySeedSmokeCheck = (database: DatabaseSync): number => {
  seedDefaultCategories(database)
  seedDefaultCategories(database)

  const categoriesRepository = createCategoriesRepository(database)

  return categoriesRepository.count()
}

const runCategoryCrudSmokeCheck = (database: DatabaseSync): boolean => {
  const categoriesRepository = createCategoriesRepository(database)
  const timestamp = '2026-01-01T00:00:00.000Z'
  const createdCategory = categoriesRepository.create({
    color: '#228be6',
    createdAt: timestamp,
    id: 'crud-category',
    name: 'CRUD category',
    updatedAt: timestamp,
  })

  const updatedCategory = categoriesRepository.update({
    color: '#40c057',
    id: createdCategory.id,
    name: 'Updated CRUD category',
    updatedAt: timestamp,
  })

  database
    .prepare(
      `INSERT INTO transactions (
        id,
        transaction_date,
        description,
        amount_minor,
        currency,
        direction,
        category_id,
        source_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'crud-transaction',
      '2026-01-01',
      'CRUD transaction',
      1000,
      'USD',
      'expense',
      createdCategory.id,
      'crud-source-hash',
      timestamp,
      timestamp,
    )

  const categoryExistsBeforeDelete = categoriesRepository.existsByName(
    'Updated CRUD category',
  )
  const wasDeleted = categoriesRepository.deleteById(createdCategory.id)
  const transactionRow = database
    .prepare('SELECT category_id FROM transactions WHERE id = ?')
    .get('crud-transaction') as { category_id: string | null } | undefined

  return (
    createdCategory.name === 'CRUD category' &&
    updatedCategory?.name === 'Updated CRUD category' &&
    categoryExistsBeforeDelete &&
    wasDeleted &&
    categoriesRepository.findById(createdCategory.id) === null &&
    transactionRow?.category_id === null
  )
}

const runTransactionSourceHashUniqueSmokeCheck = (database: DatabaseSync): boolean => {
  const timestamp = '2026-01-01T00:00:00.000Z'
  const insertTransaction = database.prepare(
    `INSERT INTO transactions (
      id,
      transaction_date,
      description,
      amount_minor,
      currency,
      direction,
      source_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  insertTransaction.run(
    'unique-source-hash-transaction-1',
    '2026-01-02',
    'Unique source hash transaction 1',
    1000,
    'USD',
    'expense',
    'unique-source-hash-smoke',
    timestamp,
    timestamp,
  )

  try {
    insertTransaction.run(
      'unique-source-hash-transaction-2',
      '2026-01-03',
      'Unique source hash transaction 2',
      2000,
      'USD',
      'expense',
      'unique-source-hash-smoke',
      timestamp,
      timestamp,
    )
  } catch {
    return true
  }

  return false
}

const runImportHistoryClearSmokeCheck = (database: DatabaseSync): boolean => {
  const timestamp = '2026-01-01T00:00:00.000Z'
  const importBatchesRepository = createImportBatchesRepository(database)

  importBatchesRepository.insert({
    adapterId: 'smoke-adapter-v1',
    duplicateCount: 0,
    failedCount: 0,
    id: 'clear-history-batch',
    importedAt: timestamp,
    insertedCount: 1,
    rowCount: 1,
    sourceFileHash: 'clear-history-source-file-hash',
    sourceFileName: 'sample.csv',
  })

  database
    .prepare(
      `INSERT INTO transactions (
        id,
        transaction_date,
        description,
        amount_minor,
        currency,
        direction,
        source_hash,
        import_batch_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'clear-history-transaction',
      '2026-01-04',
      'Clear history transaction',
      3000,
      'USD',
      'expense',
      'clear-history-source-hash',
      'clear-history-batch',
      timestamp,
      timestamp,
    )

  const clearedCount = importBatchesRepository.clear()
  const transactionRow = database
    .prepare('SELECT import_batch_id FROM transactions WHERE id = ?')
    .get('clear-history-transaction') as { import_batch_id: string | null } | undefined

  return (
    clearedCount === 1 &&
    importBatchesRepository.count() === 0 &&
    transactionRow?.import_batch_id === null
  )
}

const runAnalyticsSmokeCheck = (database: DatabaseSync): boolean => {
  const timestamp = '2026-02-01T00:00:00.000Z'
  const categoriesRepository = createCategoriesRepository(database)
  const analyticsRepository = createAnalyticsRepository(database)
  const category = categoriesRepository.create({
    color: '#fa5252',
    createdAt: timestamp,
    id: 'analytics-category',
    name: 'Analytics category',
    updatedAt: timestamp,
  })
  const insertTransaction = database.prepare(
    `INSERT INTO transactions (
      id,
      transaction_date,
      description,
      amount_minor,
      currency,
      direction,
      category_id,
      source_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  insertTransaction.run(
    'analytics-expense-category',
    '2026-02-03',
    'Analytics expense category',
    2500,
    'RUB',
    'expense',
    category.id,
    'analytics-expense-category-source-hash',
    timestamp,
    timestamp,
  )
  insertTransaction.run(
    'analytics-expense-uncategorized',
    '2026-02-04',
    'Analytics expense uncategorized',
    1000,
    'RUB',
    'expense',
    null,
    'analytics-expense-uncategorized-source-hash',
    timestamp,
    timestamp,
  )
  insertTransaction.run(
    'analytics-income',
    '2026-02-05',
    'Analytics income',
    10000,
    'RUB',
    'income',
    null,
    'analytics-income-source-hash',
    timestamp,
    timestamp,
  )
  insertTransaction.run(
    'analytics-outside-range',
    '2026-03-01',
    'Analytics outside range',
    9900,
    'RUB',
    'expense',
    category.id,
    'analytics-outside-range-source-hash',
    timestamp,
    timestamp,
  )

  const query = {
    fromDate: '2026-02-01',
    largestExpensesLimit: 2,
    toDate: '2026-02-28',
  }
  const dashboard = analyticsRepository.getDashboard(query)
  const rubSummary = dashboard.periodSummary.totalsByCurrency.find(
    (summary) => summary.currency === 'RUB',
  )
  const categorizedExpense = dashboard.expensesByCategory.find(
    (expense) => expense.category?.id === category.id,
  )
  const uncategorizedExpense = dashboard.expensesByCategory.find(
    (expense) => expense.category === null,
  )

  return (
    dashboard.periodSummary.transactionCount === 3 &&
    rubSummary?.expenseTotalMinor === 3500 &&
    rubSummary.incomeTotalMinor === 10000 &&
    rubSummary.netTotalMinor === 6500 &&
    dashboard.expensesByMonth.length === 1 &&
    dashboard.expensesByMonth[0]?.month === '2026-02' &&
    dashboard.expensesByMonth[0]?.amountMinor === 3500 &&
    dashboard.incomeByMonth.length === 1 &&
    dashboard.incomeByMonth[0]?.amountMinor === 10000 &&
    categorizedExpense?.amountMinor === 2500 &&
    uncategorizedExpense?.amountMinor === 1000 &&
    dashboard.largestExpenses.length === 2 &&
    dashboard.largestExpenses[0]?.id === 'analytics-expense-category'
  )
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
    const categoryCrudSmokePassed = runCategoryCrudSmokeCheck(database)
    const transactionSourceHashUniquePassed = runTransactionSourceHashUniqueSmokeCheck(database)
    const importHistoryClearPassed = runImportHistoryClearSmokeCheck(database)
    const csvMappingProfilesSmokePassed = runCsvMappingProfilesSmokeCheck(database)
    const seededCategoryCount = runDefaultCategorySeedSmokeCheck(database)
    const analyticsSmokePassed = runAnalyticsSmokeCheck(database)

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

    if (
      !repositorySmokePassed ||
      !transactionRollbackPassed ||
      !categoryCrudSmokePassed ||
      !transactionSourceHashUniquePassed ||
      !importHistoryClearPassed ||
      !csvMappingProfilesSmokePassed ||
      !analyticsSmokePassed ||
      seededCategoryCount !== defaultCategoryCount
    ) {
      throw new Error('SQLite repository smoke check did not return expected results.')
    }

    return {
      appliedMigrationCount: migrationState.appliedMigrationCount,
      analyticsSmokePassed,
      categoryCrudSmokePassed,
      coreSchemaIndexCount: expectedCoreSchemaIndexes.length,
      coreSchemaRowCount,
      coreSchemaTableCount: expectedCoreSchemaTables.length,
      csvMappingProfilesSmokePassed,
      insertedName: insertedRow.name,
      importHistoryClearPassed,
      migrationVersion: migrationState.currentVersion,
      seededCategoryCount,
      repositorySmokePassed,
      sqliteVersion: versionRow.sqliteVersion,
      transactionRollbackPassed,
      transactionSourceHashUniquePassed,
    }
  } finally {
    database.close()
  }
}
