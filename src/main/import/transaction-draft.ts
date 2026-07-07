export type TransactionDirection = 'expense' | 'income'

export type TransactionDraft = {
  readonly amountMinor: number
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDirection
  readonly merchant: string | null
  readonly rawDescription: string | null
  readonly rowNumber: number
  readonly transactionDate: string
}
