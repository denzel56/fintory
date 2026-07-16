import type {
  GetTransactionFiltersResult,
  ListTransactionsQuery,
  ListTransactionsResult,
  UpdateTransactionCategoryInput,
  UpdateTransactionCategoryResult,
} from '../types/transaction.js'

export const transactionsIpcChannels = {
  getFilters: 'transactions:getFilters',
  list: 'transactions:list',
  updateCategory: 'transactions:updateCategory',
} as const

export type TransactionsApi = {
  getFilters: () => Promise<GetTransactionFiltersResult>
  list: (query?: ListTransactionsQuery) => Promise<ListTransactionsResult>
  updateCategory: (
    input: UpdateTransactionCategoryInput,
  ) => Promise<UpdateTransactionCategoryResult>
}
