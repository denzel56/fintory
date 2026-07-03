import type { DatabaseSync } from 'node:sqlite'

export function runInTransaction<Result>(
  database: DatabaseSync,
  callback: () => Result,
): Result {
  database.exec('BEGIN')

  try {
    const result = callback()
    database.exec('COMMIT')

    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
