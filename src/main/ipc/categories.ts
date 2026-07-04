import { ipcMain } from 'electron'
import { categoriesIpcChannels } from '../../shared/ipc/categories.js'
import type { CategoryDto, ListCategoriesResult } from '../../shared/types/category.js'
import { getActiveProjectDatabase } from '../db/project-database-connection.js'
import { createCategoriesRepository } from '../db/repositories/categories-repository.js'

const toCategoryDto = (category: {
  readonly color: string
  readonly id: string
  readonly name: string
}): CategoryDto => ({
  color: category.color,
  id: category.id,
  name: category.name,
})

export function registerCategoriesIpcHandlers(): void {
  ipcMain.handle(categoriesIpcChannels.list, (): ListCategoriesResult => {
    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before viewing categories.',
      }
    }

    try {
      const categoriesRepository = createCategoriesRepository(database)

      return {
        ok: true,
        categories: categoriesRepository.list().map(toCategoryDto),
      }
    } catch {
      return {
        ok: false,
        code: 'categories-list-failed',
        message: 'Categories could not be loaded right now.',
      }
    }
  })
}
