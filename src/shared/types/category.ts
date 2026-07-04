export type CategoryDto = {
  readonly color: string
  readonly id: string
  readonly name: string
}

export type ListCategoriesResult =
  | { readonly ok: true; readonly categories: readonly CategoryDto[] }
  | { readonly ok: false; readonly code: CategoryErrorCode; readonly message: string }

export type CategoryErrorCode = 'categories-list-failed' | 'project-not-open'
