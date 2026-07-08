import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import electronBinary from 'electron'

const isChildProcess = process.env.FINTORY_SQLITE_SMOKE_CHILD === '1'

if (!isChildProcess) {
  const result = spawnSync(electronBinary, [fileURLToPath(import.meta.url)], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      FINTORY_SQLITE_SMOKE_CHILD: '1',
    },
    stdio: 'inherit',
  })

  process.exit(result.status ?? 1)
}

try {
  const { runSqliteSmokeCheck } = await import('../dist-electron/main/db/sqlite-smoke.js')
  const result = runSqliteSmokeCheck()

  if (result.insertedName !== 'fintory') {
    throw new Error('SQLite smoke check returned an unexpected value.')
  }

  if (result.migrationVersion !== 3 || result.appliedMigrationCount !== 3) {
    throw new Error('SQLite migration smoke check returned an unexpected version.')
  }

  if (
    result.coreSchemaTableCount !== 4 ||
    result.coreSchemaIndexCount !== 7 ||
    result.coreSchemaRowCount !== 0
  ) {
    throw new Error('SQLite core schema smoke check returned an unexpected schema.')
  }

  if (!result.repositorySmokePassed || !result.transactionRollbackPassed) {
    throw new Error('SQLite repository smoke check returned an unexpected result.')
  }

  if (!result.categoryCrudSmokePassed) {
    throw new Error('SQLite category CRUD smoke check returned an unexpected result.')
  }

  if (!result.transactionSourceHashUniquePassed) {
    throw new Error('SQLite transaction source hash uniqueness smoke check returned an unexpected result.')
  }

  if (result.seededCategoryCount <= 0) {
    throw new Error('SQLite default category seed smoke check returned an unexpected result.')
  }

  console.log(
    `SQLite smoke check passed with SQLite ${result.sqliteVersion} and migration version ${result.migrationVersion}.`,
  )
} catch (error) {
  console.error(error)
  process.exit(1)
}
