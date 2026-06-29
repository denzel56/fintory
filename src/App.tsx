import { useState } from 'react'
import { AppLayout } from './renderer/layout/AppLayout'
import { AboutPage } from './renderer/pages/AboutPage'
import { CategoriesPage } from './renderer/pages/CategoriesPage'
import { DashboardPage } from './renderer/pages/DashboardPage'
import { ImportPage } from './renderer/pages/ImportPage'
import { TransactionsPage } from './renderer/pages/TransactionsPage'
import type { AppPageId } from './renderer/pages/types'

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
