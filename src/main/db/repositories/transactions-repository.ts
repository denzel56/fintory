import type { DatabaseSync } from 'node:sqlite'

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

export type TransactionsRepository = {
  readonly count: () => number
  readonly findById: (id: string) => TransactionRecord | null
}

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
  }
}
