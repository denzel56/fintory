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
