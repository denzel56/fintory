import type { PropsWithChildren } from 'react'
import type { AppPageId } from '../pages/types'

type NavigationItem = {
  id: AppPageId
  label: string
  description: string
}

type AppLayoutProps = PropsWithChildren<{
  activePage: AppPageId
  onPageChange: (pageId: AppPageId) => void
}>

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'A quick overview of income, expenses, and trends.',
  },
  {
    id: 'import',
    label: 'CSV Import',
    description: 'Bring in bank statement exports and avoid duplicates.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Search, filter, and categorize imported transactions.',
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Keep a simple set of editable spending categories.',
  },
  {
    id: 'about',
    label: 'Settings / About',
    description: 'Review local-first boundaries and future app settings.',
  },
]

const workflowSteps = [
  'Create a local project',
  'Import bank CSV exports',
  'Review and categorize transactions',
  'Understand spending history',
]

export function AppLayout({
  activePage,
  children,
  onPageChange,
}: AppLayoutProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Fintory navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <div>
            <p className="eyebrow">Local finance archive</p>
            <h1>Fintory</h1>
          </div>
        </div>

        <nav className="navigation">
          {navigationItems.map((item) => (
            <button
              aria-current={item.id === activePage ? 'page' : undefined}
              className={item.id === activePage ? 'nav-item active' : 'nav-item'}
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="hero-panel">
          <p className="eyebrow">MVP shell</p>
          <h2>Build your private financial history from bank CSV files.</h2>
          <p>
            Fintory will help create a local project, import statement exports,
            preserve history, and explore spending without cloud sync, telemetry,
            or bank API connections.
          </p>
        </header>

        <section className="content-grid" aria-label="Application overview">
          {children}

          <article className="empty-card">
            <p className="eyebrow">Primary workflow</p>
            <ol className="workflow-list">
              {workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </section>
      </section>
    </main>
  )
}
