import { useState } from 'react'
import { AboutPage } from '../pages/about/AboutPage'
import { CategoriesPage } from '../pages/categories/CategoriesPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { ImportPage } from '../pages/import/ImportPage'
import { TransactionsPage } from '../pages/transactions/TransactionsPage'
import { AppLayout } from './AppLayout'
import type { AppPageId } from './navigation'

const pages = {
  dashboard: DashboardPage,
  import: ImportPage,
  transactions: TransactionsPage,
  categories: CategoriesPage,
  about: AboutPage,
} satisfies Record<AppPageId, () => React.JSX.Element>

function App() {
  const [activePage, setActivePage] = useState<AppPageId>('dashboard')
  const ActivePage = pages[activePage]

  return (
    <AppLayout activePage={activePage} onPageChange={setActivePage}>
      <ActivePage />
    </AppLayout>
  )
}

export default App
