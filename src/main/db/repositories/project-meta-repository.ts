import type { DatabaseSync } from 'node:sqlite'

export type ProjectMetaRecord = {
  readonly createdAt: string
  readonly id: string
  readonly name: string
  readonly schemaVersion: number
  readonly updatedAt: string
}

type ProjectMetaRow = {
  readonly created_at: string
  readonly id: string
  readonly name: string
  readonly schema_version: number
  readonly updated_at: string
}

export type ProjectMetaRepository = {
  readonly count: () => number
  readonly findById: (id: string) => ProjectMetaRecord | null
}

const mapProjectMetaRow = (row: ProjectMetaRow): ProjectMetaRecord => ({
  createdAt: row.created_at,
  id: row.id,
  name: row.name,
  schemaVersion: row.schema_version,
  updatedAt: row.updated_at,
})

export function createProjectMetaRepository(database: DatabaseSync): ProjectMetaRepository {
  return {
    count: () => {
      const row = database.prepare('SELECT COUNT(*) AS count FROM project_meta').get() as
        | { count: number }
        | undefined

      return row?.count ?? 0
    },
    findById: (id) => {
      const row = database.prepare('SELECT * FROM project_meta WHERE id = ?').get(id) as
        | ProjectMetaRow
        | undefined

      return row ? mapProjectMetaRow(row) : null
    },
  }
}
