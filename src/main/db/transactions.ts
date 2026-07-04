import type { DatabaseSync } from 'node:sqlite'

type TransactionCallbackResult<Result> = Result extends PromiseLike<unknown> ? never : Result

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return typeof value === 'object' && value !== null && 'then' in value
}

export function runInTransaction<Result>(
  database: DatabaseSync,
  callback: () => TransactionCallbackResult<Result>,
): TransactionCallbackResult<Result> {
  database.exec('BEGIN')

  try {
    const result = callback()

    if (isPromiseLike(result)) {
      throw new Error('SQLite transactions require a synchronous callback.')
    }

    database.exec('COMMIT')

    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
