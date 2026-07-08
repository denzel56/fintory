import type { DatabaseSync } from 'node:sqlite'

export type ImportBatchRecord = {
  readonly adapterId: string
  readonly duplicateCount: number
  readonly failedCount: number
  readonly id: string
  readonly importedAt: string
  readonly insertedCount: number
  readonly rowCount: number
  readonly sourceFileHash: string
  readonly sourceFileName: string
}

export type CreateImportBatchInput = {
  readonly adapterId: string
  readonly duplicateCount: number
  readonly failedCount: number
  readonly id: string
  readonly importedAt: string
  readonly insertedCount: number
  readonly rowCount: number
  readonly sourceFileHash: string
  readonly sourceFileName: string
}

export type UpdateImportBatchCountsInput = {
  readonly duplicateCount: number
  readonly failedCount: number
  readonly id: string
  readonly insertedCount: number
  readonly rowCount: number
}

type ImportBatchRow = {
  readonly adapter_id: string
  readonly duplicate_count: number
  readonly failed_count: number
  readonly id: string
  readonly imported_at: string
  readonly inserted_count: number
  readonly row_count: number
  readonly source_file_hash: string
  readonly source_file_name: string
}

export type ImportBatchesRepository = {
  readonly count: () => number
  readonly findById: (id: string) => ImportBatchRecord | null
  readonly insert: (input: CreateImportBatchInput) => void
  readonly list: () => readonly ImportBatchRecord[]
  readonly updateCounts: (input: UpdateImportBatchCountsInput) => void
}

const mapImportBatchRow = (row: ImportBatchRow): ImportBatchRecord => ({
  adapterId: row.adapter_id,
  duplicateCount: row.duplicate_count,
  failedCount: row.failed_count,
  id: row.id,
  importedAt: row.imported_at,
  insertedCount: row.inserted_count,
  rowCount: row.row_count,
  sourceFileHash: row.source_file_hash,
  sourceFileName: row.source_file_name,
})

export function createImportBatchesRepository(
  database: DatabaseSync,
): ImportBatchesRepository {
  return {
    count: () => {
      const row = database.prepare('SELECT COUNT(*) AS count FROM import_batches').get() as
        | { count: number }
        | undefined

      return row?.count ?? 0
    },
    findById: (id) => {
      const row = database.prepare('SELECT * FROM import_batches WHERE id = ?').get(id) as
        | ImportBatchRow
        | undefined

      return row ? mapImportBatchRow(row) : null
    },
    insert: (input) => {
      database
        .prepare(
          `INSERT INTO import_batches (
            id,
            source_file_name,
            source_file_hash,
            adapter_id,
            imported_at,
            row_count,
            inserted_count,
            duplicate_count,
            failed_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.id,
          input.sourceFileName,
          input.sourceFileHash,
          input.adapterId,
          input.importedAt,
          input.rowCount,
          input.insertedCount,
          input.duplicateCount,
          input.failedCount,
        )
    },
    list: () => {
      const rows = database
        .prepare('SELECT * FROM import_batches ORDER BY imported_at DESC, id ASC')
        .all() as ImportBatchRow[]

      return rows.map(mapImportBatchRow)
    },
    updateCounts: (input) => {
      database
        .prepare(
          `UPDATE import_batches
          SET row_count = ?, inserted_count = ?, duplicate_count = ?, failed_count = ?
          WHERE id = ?`,
        )
        .run(
          input.rowCount,
          input.insertedCount,
          input.duplicateCount,
          input.failedCount,
          input.id,
        )
    },
  }
}
