import type { DatabaseSync } from 'node:sqlite'

type ProjectDatabaseMigration = {
  readonly id: string
  readonly up: (database: DatabaseSync) => void
  readonly version: number
}

export type ProjectDatabaseMigrationState = {
  readonly appliedMigrationCount: number
  readonly currentVersion: number
}

export type ProjectDatabaseMigrationResult = ProjectDatabaseMigrationState & {
  readonly appliedMigrationIds: readonly string[]
}

const migrationTableName = '_fintory_migrations'

const projectDatabaseMigrations: readonly ProjectDatabaseMigration[] = [
  {
    id: '0001_migration_foundation',
    version: 1,
    up: (database) => {
      database.exec('PRAGMA user_version = 1')
    },
  },
  {
    id: '0002_core_schema',
    version: 2,
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS project_meta (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          schema_version INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS import_batches (
          id TEXT PRIMARY KEY,
          source_file_name TEXT NOT NULL,
          source_file_hash TEXT NOT NULL,
          adapter_id TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
          inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (inserted_count >= 0),
          duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
          failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0)
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          transaction_date TEXT NOT NULL,
          description TEXT NOT NULL,
          merchant TEXT,
          amount_minor INTEGER NOT NULL,
          currency TEXT NOT NULL,
          direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
          category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
          source_hash TEXT NOT NULL,
          import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
          raw_description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
          ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_category_id
          ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_direction
          ON transactions(direction);
        CREATE INDEX IF NOT EXISTS idx_transactions_source_hash
          ON transactions(source_hash);
        CREATE INDEX IF NOT EXISTS idx_transactions_import_batch_id
          ON transactions(import_batch_id);
        CREATE INDEX IF NOT EXISTS idx_import_batches_source_file_hash
          ON import_batches(source_file_hash);

        PRAGMA user_version = 2;
      `)
    },
  },
  {
    id: '0003_unique_transaction_source_hash',
    version: 3,
    up: (database) => {
      database.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_hash_unique
          ON transactions(source_hash);

        PRAGMA user_version = 3;
      `)
    },
  },
]

const ensureMigrationMetadataTable = (database: DatabaseSync): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ${migrationTableName} (
      version INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

const getAppliedMigrationVersions = (database: DatabaseSync): Set<number> => {
  const rows = database.prepare(`SELECT version FROM ${migrationTableName}`).all() as Array<{
    version: number
  }>

  return new Set(rows.map((row) => row.version))
}

const runMigration = (database: DatabaseSync, migration: ProjectDatabaseMigration): void => {
  database.exec('BEGIN')

  try {
    migration.up(database)
    const insertAppliedMigration = database.prepare(
      `INSERT INTO ${migrationTableName} (version, id) VALUES (?, ?)`,
    )

    insertAppliedMigration.run(migration.version, migration.id)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export function readProjectDatabaseMigrationState(
  database: DatabaseSync,
): ProjectDatabaseMigrationState {
  ensureMigrationMetadataTable(database)

  const row = database
    .prepare(
      `SELECT COUNT(*) AS appliedMigrationCount, COALESCE(MAX(version), 0) AS currentVersion FROM ${migrationTableName}`,
    )
    .get() as { appliedMigrationCount: number; currentVersion: number } | undefined

  return {
    appliedMigrationCount: row?.appliedMigrationCount ?? 0,
    currentVersion: row?.currentVersion ?? 0,
  }
}

export function runProjectDatabaseMigrations(
  database: DatabaseSync,
): ProjectDatabaseMigrationResult {
  ensureMigrationMetadataTable(database)

  const appliedVersions = getAppliedMigrationVersions(database)
  const appliedMigrationIds: string[] = []

  for (const migration of projectDatabaseMigrations) {
    if (appliedVersions.has(migration.version)) {
      continue
    }

    runMigration(database, migration)
    appliedVersions.add(migration.version)
    appliedMigrationIds.push(migration.id)
  }

  return {
    ...readProjectDatabaseMigrationState(database),
    appliedMigrationIds,
  }
}
