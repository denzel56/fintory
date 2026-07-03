import { DatabaseSync } from 'node:sqlite'
import { runProjectDatabaseMigrations } from './migrations/project-database-migrations.js'

type ActiveProjectDatabaseConnection = {
  readonly database: DatabaseSync
}

let activeProjectDatabaseConnection: ActiveProjectDatabaseConnection | null = null

export function openProjectDatabaseConnection(filePath: string): void {
  closeActiveProjectDatabaseConnection()
  const database = new DatabaseSync(filePath)

  try {
    database.exec('PRAGMA foreign_keys = ON')
    database.exec('PRAGMA user_version')
    runProjectDatabaseMigrations(database)
  } catch (error) {
    database.close()
    throw error
  }

  activeProjectDatabaseConnection = {
    database,
  }
}

export function closeActiveProjectDatabaseConnection(): void {
  if (!activeProjectDatabaseConnection) {
    return
  }

  activeProjectDatabaseConnection.database.close()
  activeProjectDatabaseConnection = null
}
