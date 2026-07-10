import { ipcMain } from 'electron'
import { transactionsIpcChannels } from '../../shared/ipc/transactions.js'
import type {
  GetTransactionFiltersResult,
  ListTransactionsResult,
  TransactionDto,
} from '../../shared/types/transaction.js'
import { validateListTransactionsQuery } from '../../shared/validation/transaction.js'
import { getActiveProjectDatabase } from '../db/project-database-connection.js'
import { createCategoriesRepository } from '../db/repositories/categories-repository.js'
import { createTransactionsRepository } from '../db/repositories/transactions-repository.js'

const toTransactionDto = (transaction: {
  readonly amountMinor: number
  readonly category: TransactionDto['category']
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDto['direction']
  readonly id: string
  readonly merchant: string | null
  readonly transactionDate: string
}): TransactionDto => ({
  amountMinor: transaction.amountMinor,
  category: transaction.category,
  currency: transaction.currency,
  description: transaction.description,
  direction: transaction.direction,
  id: transaction.id,
  merchant: transaction.merchant,
  transactionDate: transaction.transactionDate,
})

const toCategoryDto = (category: {
  readonly color: string
  readonly id: string
  readonly name: string
}): NonNullable<TransactionDto['category']> => ({
  color: category.color,
  id: category.id,
  name: category.name,
})

export function registerTransactionsIpcHandlers(): void {
  ipcMain.handle(transactionsIpcChannels.list, (_event, input: unknown): ListTransactionsResult => {
    const validationResult = validateListTransactionsQuery(input)

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
        message: 'Open or create a project before viewing transactions.',
      }
    }

    try {
      const transactionsRepository = createTransactionsRepository(database)
      const result = transactionsRepository.list(validationResult.value)

      return {
        ok: true,
        page: {
          page: validationResult.value.page,
          pageSize: validationResult.value.pageSize,
          totalCount: result.totalCount,
          transactions: result.transactions.map(toTransactionDto),
        },
      }
    } catch {
      return {
        ok: false,
        code: 'transactions-list-failed',
        message: 'Transactions could not be loaded right now.',
      }
    }
  })

  ipcMain.handle(transactionsIpcChannels.getFilters, (): GetTransactionFiltersResult => {
    const database = getActiveProjectDatabase()

    if (!database) {
      return {
        ok: false,
        code: 'project-not-open',
        message: 'Open or create a project before viewing transaction filters.',
      }
    }

    try {
      const categoriesRepository = createCategoriesRepository(database)
      const transactionsRepository = createTransactionsRepository(database)
      const transactionFilters = transactionsRepository.getFilters()

      return {
        ok: true,
        filters: {
          categories: categoriesRepository.list().map(toCategoryDto),
          currencies: transactionFilters.currencies,
          dateRange: transactionFilters.dateRange,
          directions: transactionFilters.directions,
        },
      }
    } catch {
      return {
        ok: false,
        code: 'transaction-filters-failed',
        message: 'Transaction filters could not be loaded right now.',
      }
    }
  })
}
