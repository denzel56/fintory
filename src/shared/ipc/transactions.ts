import type {
  GetTransactionFiltersResult,
  ListTransactionsQuery,
  ListTransactionsResult,
} from '../types/transaction.js'

export const transactionsIpcChannels = {
  getFilters: 'transactions:getFilters',
  list: 'transactions:list',
} as const

export type TransactionsApi = {
  getFilters: () => Promise<GetTransactionFiltersResult>
  list: (query?: ListTransactionsQuery) => Promise<ListTransactionsResult>
}
