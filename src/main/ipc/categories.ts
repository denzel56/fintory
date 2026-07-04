import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { categoriesIpcChannels } from '../../shared/ipc/categories.js'
import type {
  CategoryDto,
  CreateCategoryResult,
  DeleteCategoryResult,
  ListCategoriesResult,
  UpdateCategoryResult,
} from '../../shared/types/category.js'
import {
  validateCreateCategoryInput,
  validateDeleteCategoryInput,
  validateUpdateCategoryInput,
} from '../../shared/validation/category.js'
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

const getTimestamp = (): string => new Date().toISOString()

export function registerCategoriesIpcHandlers(): void {
  ipcMain.handle(categoriesIpcChannels.create, (_event, input: unknown): CreateCategoryResult => {
    const validationResult = validateCreateCategoryInput(input)

    if (!validationResult.ok) {
      return {
        ok: false,
        code: validationResult.code,
        message: validationResult.message,
      }
    }

    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before creating categories.',
      }
    }

    try {
      const categoriesRepository = createCategoriesRepository(database)

      if (categoriesRepository.existsByName(validationResult.value.name)) {
        return {
          ok: false,
          code: 'category-duplicate-name',
          message: 'A category with this name already exists.',
        }
      }

      const timestamp = getTimestamp()
      const category = categoriesRepository.create({
        color: validationResult.value.color,
        createdAt: timestamp,
        id: randomUUID(),
        name: validationResult.value.name,
        updatedAt: timestamp,
      })

      return { ok: true, category: toCategoryDto(category) }
    } catch {
      return {
        ok: false,
        code: 'category-create-failed',
        message: 'Category could not be created right now.',
      }
    }
  })

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

  ipcMain.handle(categoriesIpcChannels.update, (_event, input: unknown): UpdateCategoryResult => {
    const validationResult = validateUpdateCategoryInput(input)

    if (!validationResult.ok) {
      return {
        ok: false,
        code: validationResult.code,
        message: validationResult.message,
      }
    }

    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before editing categories.',
      }
    }

    try {
      const categoriesRepository = createCategoriesRepository(database)

      if (
        categoriesRepository.existsByName(
          validationResult.value.name,
          validationResult.value.id,
        )
      ) {
        return {
          ok: false,
          code: 'category-duplicate-name',
          message: 'A category with this name already exists.',
        }
      }

      const category = categoriesRepository.update({
        color: validationResult.value.color,
        id: validationResult.value.id,
        name: validationResult.value.name,
        updatedAt: getTimestamp(),
      })

      if (!category) {
        return {
          ok: false,
          code: 'category-not-found',
          message: 'Category was not found.',
        }
      }

      return { ok: true, category: toCategoryDto(category) }
    } catch {
      return {
        ok: false,
        code: 'category-update-failed',
        message: 'Category could not be updated right now.',
      }
    }
  })

  ipcMain.handle(categoriesIpcChannels.delete, (_event, input: unknown): DeleteCategoryResult => {
    const validationResult = validateDeleteCategoryInput(input)

    if (!validationResult.ok) {
      return {
        ok: false,
        code: validationResult.code,
        message: validationResult.message,
      }
    }

    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before deleting categories.',
      }
    }

    try {
      const categoriesRepository = createCategoriesRepository(database)
      const wasDeleted = categoriesRepository.deleteById(validationResult.value.id)

      if (!wasDeleted) {
        return {
          ok: false,
          code: 'category-not-found',
          message: 'Category was not found.',
        }
      }

      return { ok: true, deletedCategoryId: validationResult.value.id }
    } catch {
      return {
        ok: false,
        code: 'category-delete-failed',
        message:
          'Category could not be deleted right now. Related transactions are uncategorized before deletion.',
      }
    }
  })
}
