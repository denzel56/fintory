import type {
  CreateCategoryInput,
  CreateCategoryResult,
  DeleteCategoryInput,
  DeleteCategoryResult,
  ListCategoriesResult,
  UpdateCategoryInput,
  UpdateCategoryResult,
} from '../types/category.js'

export const categoriesIpcChannels = {
  create: 'categories:create',
  delete: 'categories:delete',
  list: 'categories:list',
  update: 'categories:update',
} as const

export type CategoriesApi = {
  create: (input: CreateCategoryInput) => Promise<CreateCategoryResult>
  delete: (input: DeleteCategoryInput) => Promise<DeleteCategoryResult>
  list: () => Promise<ListCategoriesResult>
  update: (input: UpdateCategoryInput) => Promise<UpdateCategoryResult>
}
