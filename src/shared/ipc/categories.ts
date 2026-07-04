import type { ListCategoriesResult } from '../types/category.js'

export const categoriesIpcChannels = {
  list: 'categories:list',
} as const

export type CategoriesApi = {
  list: () => Promise<ListCategoriesResult>
}
