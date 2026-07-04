export type CategoryDto = {
  readonly color: string
  readonly id: string
  readonly name: string
}

export type CreateCategoryInput = {
  readonly color: string
  readonly name: string
}

export type UpdateCategoryInput = {
  readonly color: string
  readonly id: string
  readonly name: string
}

export type DeleteCategoryInput = {
  readonly id: string
}

export type ListCategoriesResult =
  | { readonly ok: true; readonly categories: readonly CategoryDto[] }
  | { readonly ok: false; readonly code: CategoryErrorCode; readonly message: string }

export type CreateCategoryResult =
  | { readonly ok: true; readonly category: CategoryDto }
  | { readonly ok: false; readonly code: CategoryErrorCode; readonly message: string }

export type UpdateCategoryResult =
  | { readonly ok: true; readonly category: CategoryDto }
  | { readonly ok: false; readonly code: CategoryErrorCode; readonly message: string }

export type DeleteCategoryResult =
  | { readonly ok: true; readonly deletedCategoryId: string }
  | { readonly ok: false; readonly code: CategoryErrorCode; readonly message: string }

export type CategoryErrorCode =
  | 'categories-list-failed'
  | 'category-create-failed'
  | 'category-delete-failed'
  | 'category-duplicate-name'
  | 'category-not-found'
  | 'category-update-failed'
  | 'invalid-category-color'
  | 'invalid-category-id'
  | 'invalid-category-name'
  | 'project-not-open'
