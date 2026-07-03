import { DatabaseSync } from 'node:sqlite'

type ActiveProjectDatabaseConnection = {
  readonly database: DatabaseSync
}

let activeProjectDatabaseConnection: ActiveProjectDatabaseConnection | null = null

export function openProjectDatabaseConnection(filePath: string): void {
  closeActiveProjectDatabaseConnection()
  const database = new DatabaseSync(filePath)

  try {
    database.exec('PRAGMA user_version')
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
