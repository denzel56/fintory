import type { DatabaseSync } from 'node:sqlite'
import type {
  TransactionDirection,
  TransactionSortDirection,
  TransactionSortField,
  ValidatedListTransactionsQuery,
} from '../../../shared/types/transaction.js'

type SqlParameter = number | string | null

export type TransactionRecord = {
  readonly amountMinor: number
  readonly categoryId: string | null
  readonly createdAt: string
  readonly currency: string
  readonly description: string
  readonly direction: 'expense' | 'income'
  readonly id: string
  readonly importBatchId: string | null
  readonly merchant: string | null
  readonly rawDescription: string | null
  readonly sourceHash: string
  readonly transactionDate: string
  readonly updatedAt: string
}

export type ListedTransactionRecord = {
  readonly amountMinor: number
  readonly category: {
    readonly color: string
    readonly id: string
    readonly name: string
  } | null
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDirection
  readonly id: string
  readonly merchant: string | null
  readonly transactionDate: string
}

export type TransactionFiltersRecord = {
  readonly currencies: readonly string[]
  readonly dateRange: {
    readonly fromDate: string | null
    readonly toDate: string | null
  }
  readonly directions: readonly TransactionDirection[]
}

export type ListTransactionsRepositoryResult = {
  readonly totalCount: number
  readonly transactions: readonly ListedTransactionRecord[]
}

export type CreateTransactionInput = {
  readonly amountMinor: number
  readonly categoryId: string | null
  readonly createdAt: string
  readonly currency: string
  readonly description: string
  readonly direction: 'expense' | 'income'
  readonly id: string
  readonly importBatchId: string | null
  readonly merchant: string | null
  readonly rawDescription: string | null
  readonly sourceHash: string
  readonly transactionDate: string
  readonly updatedAt: string
}

type TransactionRow = {
  readonly amount_minor: number
  readonly category_id: string | null
  readonly created_at: string
  readonly currency: string
  readonly description: string
  readonly direction: 'expense' | 'income'
  readonly id: string
  readonly import_batch_id: string | null
  readonly merchant: string | null
  readonly raw_description: string | null
  readonly source_hash: string
  readonly transaction_date: string
  readonly updated_at: string
}

type ListedTransactionRow = {
  readonly amount_minor: number
  readonly category_color: string | null
  readonly category_id: string | null
  readonly category_name: string | null
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDirection
  readonly id: string
  readonly merchant: string | null
  readonly transaction_date: string
}

type TransactionFilterBoundsRow = {
  readonly from_date: string | null
  readonly to_date: string | null
}

type TransactionFilterCurrencyRow = {
  readonly currency: string
}

type TransactionFilterDirectionRow = {
  readonly direction: TransactionDirection
}

export type TransactionsRepository = {
  readonly count: () => number
  readonly findById: (id: string) => TransactionRecord | null
  readonly getFilters: () => TransactionFiltersRecord
  readonly insertIfSourceHashIsNew: (input: CreateTransactionInput) => boolean
  readonly list: (query: ValidatedListTransactionsQuery) => ListTransactionsRepositoryResult
}

const sortColumnByField = {
  amount: 'transactions.amount_minor',
  date: 'transactions.transaction_date',
  description: 'transactions.description COLLATE NOCASE',
} satisfies Record<TransactionSortField, string>

const mapTransactionRow = (row: TransactionRow): TransactionRecord => ({
  amountMinor: row.amount_minor,
  categoryId: row.category_id,
  createdAt: row.created_at,
  currency: row.currency,
  description: row.description,
  direction: row.direction,
  id: row.id,
  importBatchId: row.import_batch_id,
  merchant: row.merchant,
  rawDescription: row.raw_description,
  sourceHash: row.source_hash,
  transactionDate: row.transaction_date,
  updatedAt: row.updated_at,
})

const mapListedTransactionRow = (row: ListedTransactionRow): ListedTransactionRecord => ({
  amountMinor: row.amount_minor,
  category:
    row.category_id && row.category_name && row.category_color
      ? {
          color: row.category_color,
          id: row.category_id,
          name: row.category_name,
        }
      : null,
  currency: row.currency,
  description: row.description,
  direction: row.direction,
  id: row.id,
  merchant: row.merchant,
  transactionDate: row.transaction_date,
})

const escapeLikeSearch = (value: string): string => {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

const buildListTransactionsFilter = (
  query: ValidatedListTransactionsQuery,
): { readonly parameters: readonly SqlParameter[]; readonly whereSql: string } => {
  const parameters: SqlParameter[] = []
  const whereClauses: string[] = []

  if (query.search) {
    const searchPattern = `%${escapeLikeSearch(query.search)}%`
    whereClauses.push(
      `(transactions.description LIKE ? ESCAPE '\\' OR transactions.merchant LIKE ? ESCAPE '\\')`,
    )
    parameters.push(searchPattern, searchPattern)
  }

  if (query.fromDate) {
    whereClauses.push('transactions.transaction_date >= ?')
    parameters.push(query.fromDate)
  }

  if (query.toDate) {
    whereClauses.push('transactions.transaction_date <= ?')
    parameters.push(query.toDate)
  }

  if (query.categoryId) {
    whereClauses.push('transactions.category_id = ?')
    parameters.push(query.categoryId)
  }

  if (query.direction) {
    whereClauses.push('transactions.direction = ?')
    parameters.push(query.direction)
  }

  return {
    parameters,
    whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
  }
}

const getSortDirectionSql = (sortDirection: TransactionSortDirection): 'ASC' | 'DESC' => {
  return sortDirection === 'asc' ? 'ASC' : 'DESC'
}

export function createTransactionsRepository(database: DatabaseSync): TransactionsRepository {
  return {
    count: () => {
      const row = database.prepare('SELECT COUNT(*) AS count FROM transactions').get() as
        | { count: number }
        | undefined

      return row?.count ?? 0
    },
    findById: (id) => {
      const row = database.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
        | TransactionRow
        | undefined

      return row ? mapTransactionRow(row) : null
    },
    getFilters: () => {
      const boundsRow = database
        .prepare(
          `SELECT
            MIN(transaction_date) AS from_date,
            MAX(transaction_date) AS to_date
          FROM transactions`,
        )
        .get() as TransactionFilterBoundsRow | undefined
      const currencyRows = database
        .prepare('SELECT DISTINCT currency FROM transactions ORDER BY currency ASC')
        .all() as TransactionFilterCurrencyRow[]
      const directionRows = database
        .prepare('SELECT DISTINCT direction FROM transactions ORDER BY direction ASC')
        .all() as TransactionFilterDirectionRow[]

      return {
        currencies: currencyRows.map((row) => row.currency),
        dateRange: {
          fromDate: boundsRow?.from_date ?? null,
          toDate: boundsRow?.to_date ?? null,
        },
        directions: directionRows.map((row) => row.direction),
      }
    },
    insertIfSourceHashIsNew: (input) => {
      const result = database
        .prepare(
          `INSERT INTO transactions (
            id,
            transaction_date,
            description,
            merchant,
            amount_minor,
            currency,
            direction,
            category_id,
            source_hash,
            import_batch_id,
            raw_description,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_hash) DO NOTHING`,
        )
        .run(
          input.id,
          input.transactionDate,
          input.description,
          input.merchant,
          input.amountMinor,
          input.currency,
          input.direction,
          input.categoryId,
          input.sourceHash,
          input.importBatchId,
          input.rawDescription,
          input.createdAt,
          input.updatedAt,
        )

      return result.changes > 0
    },
    list: (query) => {
      const { parameters, whereSql } = buildListTransactionsFilter(query)
      const countRow = database
        .prepare(`SELECT COUNT(*) AS count FROM transactions ${whereSql}`)
        .get(...parameters) as { count: number } | undefined
      const offset = (query.page - 1) * query.pageSize
      const rows = database
        .prepare(
          `SELECT
            transactions.id,
            transactions.transaction_date,
            transactions.description,
            transactions.merchant,
            transactions.amount_minor,
            transactions.currency,
            transactions.direction,
            categories.id AS category_id,
            categories.name AS category_name,
            categories.color AS category_color
          FROM transactions
          LEFT JOIN categories ON categories.id = transactions.category_id
          ${whereSql}
          ORDER BY ${sortColumnByField[query.sortField]} ${getSortDirectionSql(
            query.sortDirection,
          )}, transactions.id ASC
          LIMIT ? OFFSET ?`,
        )
        .all(...parameters, query.pageSize, offset) as ListedTransactionRow[]

      return {
        totalCount: countRow?.count ?? 0,
        transactions: rows.map(mapListedTransactionRow),
      }
    },
  }
}
