import type { CategoryDto } from './category.js'

export type TransactionDirection = 'expense' | 'income'

export type TransactionSortDirection = 'asc' | 'desc'

export type TransactionSortField = 'amount' | 'date' | 'description'

export type TransactionDto = {
  readonly amountMinor: number
  readonly category: CategoryDto | null
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDirection
  readonly id: string
  readonly merchant: string | null
  readonly transactionDate: string
}

export type ListTransactionsQuery = {
  readonly categoryId?: string | null
  readonly direction?: TransactionDirection | null
  readonly fromDate?: string | null
  readonly page?: number
  readonly pageSize?: number
  readonly search?: string | null
  readonly sortDirection?: TransactionSortDirection
  readonly sortField?: TransactionSortField
  readonly toDate?: string | null
}

export type UpdateTransactionCategoryInput = {
  readonly categoryId: string | null
  readonly transactionId: string
}

export type ValidatedListTransactionsQuery = {
  readonly categoryId: string | null
  readonly direction: TransactionDirection | null
  readonly fromDate: string | null
  readonly page: number
  readonly pageSize: number
  readonly search: string | null
  readonly sortDirection: TransactionSortDirection
  readonly sortField: TransactionSortField
  readonly toDate: string | null
}

export type ListTransactionsPage = {
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly transactions: readonly TransactionDto[]
}

export type TransactionFiltersDto = {
  readonly categories: readonly CategoryDto[]
  readonly currencies: readonly string[]
  readonly dateRange: {
    readonly fromDate: string | null
    readonly toDate: string | null
  }
  readonly directions: readonly TransactionDirection[]
}

export type TransactionsErrorCode =
  | 'category-not-found'
  | 'invalid-transaction-category-update'
  | 'invalid-transactions-query'
  | 'project-not-open'
  | 'transaction-category-update-failed'
  | 'transaction-filters-failed'
  | 'transaction-not-found'
  | 'transactions-list-failed'

export type ListTransactionsResult =
  | { readonly ok: true; readonly page: ListTransactionsPage }
  | { readonly ok: false; readonly code: TransactionsErrorCode; readonly message: string }

export type GetTransactionFiltersResult =
  | { readonly ok: true; readonly filters: TransactionFiltersDto }
  | { readonly ok: false; readonly code: TransactionsErrorCode; readonly message: string }

export type UpdateTransactionCategoryResult =
  | {
      readonly ok: true
      readonly categoryId: string | null
      readonly transactionId: string
    }
  | { readonly ok: false; readonly code: TransactionsErrorCode; readonly message: string }
