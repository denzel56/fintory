import type { DatabaseSync } from 'node:sqlite'

type SyncTransactionCallback<Callback extends () => unknown> =
  [ReturnType<Callback>] extends [never]
    ? unknown
    : ReturnType<Callback> extends PromiseLike<unknown>
      ? never
      : unknown

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return false
  }

  return 'then' in value
}

export function runInTransaction<Callback extends () => unknown>(
  database: DatabaseSync,
  callback: Callback & SyncTransactionCallback<Callback>,
): ReturnType<Callback> {
  database.exec('BEGIN')

  try {
    const result = callback() as ReturnType<Callback>

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
