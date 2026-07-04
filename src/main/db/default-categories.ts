import type { DatabaseSync } from 'node:sqlite'
import { createCategoriesRepository } from './repositories/categories-repository.js'
import type { NewCategoryRecord } from './repositories/categories-repository.js'
import { runInTransaction } from './transactions.js'

const defaultCategories = [
  { id: 'default-groceries', name: 'Groceries', color: '#40c057' },
  { id: 'default-dining', name: 'Dining out', color: '#fd7e14' },
  { id: 'default-transport', name: 'Transport', color: '#228be6' },
  { id: 'default-housing', name: 'Housing', color: '#7950f2' },
  { id: 'default-utilities', name: 'Utilities', color: '#15aabf' },
  { id: 'default-health', name: 'Health', color: '#e64980' },
  { id: 'default-entertainment', name: 'Entertainment', color: '#fab005' },
  { id: 'default-shopping', name: 'Shopping', color: '#be4bdb' },
  { id: 'default-travel', name: 'Travel', color: '#12b886' },
  { id: 'default-income', name: 'Income', color: '#2f9e44' },
  { id: 'default-other', name: 'Other', color: '#868e96' },
] as const

export const defaultCategoryCount = defaultCategories.length

const getDefaultCategoryRecords = (timestamp: string): readonly NewCategoryRecord[] =>
  defaultCategories.map((category) => ({
    ...category,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

export function seedDefaultCategories(database: DatabaseSync): number {
  return runInTransaction(database, () => {
    const categoriesRepository = createCategoriesRepository(database)

    return categoriesRepository.insertDefaults(
      getDefaultCategoryRecords(new Date().toISOString()),
    )
  })
}
