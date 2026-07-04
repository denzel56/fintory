import type { DatabaseSync } from 'node:sqlite'
import { runInTransaction } from '../transactions.js'

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

export type UpdateCategoryRecord = {
  readonly color: string
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
  readonly create: (category: NewCategoryRecord) => CategoryRecord
  readonly deleteById: (id: string) => boolean
  readonly existsByName: (name: string, excludedId?: string) => boolean
  readonly findById: (id: string) => CategoryRecord | null
  readonly insertDefaults: (categories: readonly NewCategoryRecord[]) => number
  readonly list: () => readonly CategoryRecord[]
  readonly update: (category: UpdateCategoryRecord) => CategoryRecord | null
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
    create: (category) => {
      database
        .prepare(
          `INSERT INTO categories (id, name, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          category.id,
          category.name,
          category.color,
          category.createdAt,
          category.updatedAt,
        )

      const createdCategory = database.prepare('SELECT * FROM categories WHERE id = ?').get(
        category.id,
      ) as CategoryRow | undefined

      if (!createdCategory) {
        throw new Error('Created category could not be loaded.')
      }

      return mapCategoryRow(createdCategory)
    },
    deleteById: (id) => {
      return runInTransaction(database, () => {
        database.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(id)
        const result = database.prepare('DELETE FROM categories WHERE id = ?').run(id)

        return Number(result.changes ?? 0) > 0
      })
    },
    existsByName: (name, excludedId) => {
      const row = excludedId
        ? (database
            .prepare(
              'SELECT 1 AS found FROM categories WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
            )
            .get(name, excludedId) as { found: number } | undefined)
        : (database
            .prepare('SELECT 1 AS found FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1')
            .get(name) as { found: number } | undefined)

      return row?.found === 1
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
    update: (category) => {
      const result = database
        .prepare('UPDATE categories SET name = ?, color = ?, updated_at = ? WHERE id = ?')
        .run(category.name, category.color, category.updatedAt, category.id)

      if (Number(result.changes ?? 0) === 0) {
        return null
      }

      const updatedCategory = database.prepare('SELECT * FROM categories WHERE id = ?').get(
        category.id,
      ) as CategoryRow | undefined

      return updatedCategory ? mapCategoryRow(updatedCategory) : null
    },
  }
}
