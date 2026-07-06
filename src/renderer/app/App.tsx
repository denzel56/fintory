import { useState } from 'react'
import { AboutPage } from '../pages/about/AboutPage'
import { CategoriesPage } from '../pages/categories/CategoriesPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { ImportPage } from '../pages/import/ImportPage'
import { ProjectPage } from '../pages/project/ProjectPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { TransactionsPage } from '../pages/transactions/TransactionsPage'
import { AppLayout } from './AppLayout'
import type { AppPageId } from './navigation'

const pages = {
  overview: DashboardPage,
  import: ImportPage,
  transactions: TransactionsPage,
  categories: CategoriesPage,
  project: ProjectPage,
  settings: SettingsPage,
  about: AboutPage,
} satisfies Record<AppPageId, () => React.JSX.Element>

function App() {
  const [activePage, setActivePage] = useState<AppPageId>('overview')
  const ActivePage = pages[activePage]

  return (
    <AppLayout activePage={activePage} onPageChange={setActivePage}>
      <ActivePage />
    </AppLayout>
  )
}

export default App
