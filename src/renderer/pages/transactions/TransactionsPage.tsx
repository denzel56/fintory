import { PlaceholderPage } from '../../shared/ui/PlaceholderPage'

export function TransactionsPage() {
  return (
    <PlaceholderPage
      description="A future transaction browser for search, filters, sorting, and category updates."
      emptyDescription="Transactions will appear here after local SQLite storage and CSV import are available."
      emptyTitle="No transactions yet."
      eyebrow="Transactions"
      title="Transaction list placeholder"
    />
  )
}
