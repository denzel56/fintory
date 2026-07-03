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

  if (result.migrationVersion !== 1 || result.appliedMigrationCount !== 1) {
    throw new Error('SQLite migration smoke check returned an unexpected version.')
  }

  console.log(
    `SQLite smoke check passed with SQLite ${result.sqliteVersion} and migration version ${result.migrationVersion}.`,
  )
} catch (error) {
  console.error(error)
  process.exit(1)
}
