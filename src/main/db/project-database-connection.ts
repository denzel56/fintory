import { DatabaseSync } from 'node:sqlite'
import { runProjectDatabaseMigrations } from './migrations/project-database-migrations.js'
import type { ProjectErrorCode } from '../../shared/types/project.js'

type ActiveProjectDatabaseConnection = {
  readonly database: DatabaseSync
}

let activeProjectDatabaseConnection: ActiveProjectDatabaseConnection | null = null

export class ProjectDatabaseConnectionError extends Error {
  readonly code: ProjectErrorCode

  constructor(code: ProjectErrorCode) {
    super(code)
    this.code = code
  }
}

const getDatabaseFailureCode = (error: unknown): ProjectErrorCode => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('database is locked') || message.includes('sqlite_busy')) {
    return 'project-database-locked'
  }

  if (message.includes('file is not a database') || message.includes('database disk image is malformed')) {
    return 'project-database-corrupt'
  }

  return 'project-migration-failed'
}

export function openProjectDatabaseConnection(filePath: string): DatabaseSync {
  closeActiveProjectDatabaseConnection()
  let database: DatabaseSync

  try {
    database = new DatabaseSync(filePath)
  } catch {
    throw new ProjectDatabaseConnectionError('project-database-open-failed')
  }

  try {
    database.exec('PRAGMA foreign_keys = ON')
    database.exec('PRAGMA user_version')
    runProjectDatabaseMigrations(database)
  } catch (error) {
    database.close()
    throw new ProjectDatabaseConnectionError(getDatabaseFailureCode(error))
  }

  activeProjectDatabaseConnection = {
    database,
  }

  return database
}

export function closeActiveProjectDatabaseConnection(): void {
  if (!activeProjectDatabaseConnection) {
    return
  }

  activeProjectDatabaseConnection.database.close()
  activeProjectDatabaseConnection = null
}

export function getActiveProjectDatabase(): DatabaseSync | null {
  return activeProjectDatabaseConnection?.database ?? null
}
