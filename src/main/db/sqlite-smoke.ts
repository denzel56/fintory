import { DatabaseSync } from 'node:sqlite'
import {
  readProjectDatabaseMigrationState,
  runProjectDatabaseMigrations,
} from './migrations/project-database-migrations.js'

export type SqliteSmokeResult = {
  readonly appliedMigrationCount: number
  readonly insertedName: string
  readonly migrationVersion: number
  readonly sqliteVersion: string
}

export function runSqliteSmokeCheck(): SqliteSmokeResult {
  const database = new DatabaseSync(':memory:')

  try {
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

    if (!insertedRow || !versionRow) {
      throw new Error('SQLite smoke check did not return expected rows.')
    }

    return {
      appliedMigrationCount: migrationState.appliedMigrationCount,
      insertedName: insertedRow.name,
      migrationVersion: migrationState.currentVersion,
      sqliteVersion: versionRow.sqliteVersion,
    }
  } finally {
    database.close()
  }
}
