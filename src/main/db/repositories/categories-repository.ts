import type { DatabaseSync } from 'node:sqlite'

export type CategoryRecord = {
  readonly color: string
  readonly createdAt: string
  readonly id: string
  readonly name: string
  readonly updatedAt: string
}

export type NewCategoryRecord = {
  readonly color: string
  readonly createdAt: string
  readonly id: string
  readonly name: string
  readonly updatedAt: string
}

type CategoryRow = {
  readonly color: string
  readonly created_at: string
  readonly id: string
  readonly name: string
  readonly updated_at: string
}

export type CategoriesRepository = {
  readonly count: () => number
  readonly findById: (id: string) => CategoryRecord | null
  readonly insertDefaults: (categories: readonly NewCategoryRecord[]) => number
  readonly list: () => readonly CategoryRecord[]
}

const mapCategoryRow = (row: CategoryRow): CategoryRecord => ({
  color: row.color,
  createdAt: row.created_at,
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at,
})

export function createCategoriesRepository(database: DatabaseSync): CategoriesRepository {
  return {
    count: () => {
      const row = database.prepare('SELECT COUNT(*) AS count FROM categories').get() as
        | { count: number }
        | undefined

      return row?.count ?? 0
    },
    findById: (id) => {
      const row = database.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
        | CategoryRow
        | undefined

      return row ? mapCategoryRow(row) : null
    },
    insertDefaults: (categories) => {
      const insertCategory = database.prepare(
        `INSERT OR IGNORE INTO categories (id, name, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )

      return categories.reduce((insertedCount, category) => {
        const result = insertCategory.run(
          category.id,
          category.name,
          category.color,
          category.createdAt,
          category.updatedAt,
        )

        return insertedCount + Number(result.changes ?? 0)
      }, 0)
    },
    list: () => {
      const rows = database
        .prepare('SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC, id ASC')
        .all() as CategoryRow[]

      return rows.map(mapCategoryRow)
    },
  }
}
