import { useState } from 'react'
import './App.css'

type AppSection = 'dashboard' | 'transactions' | 'import' | 'categories'

type NavigationItem = {
  id: AppSection
  label: string
  description: string
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'A quick overview of income, expenses, and trends.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Search, filter, and categorize imported transactions.',
  },
  {
    id: 'import',
    label: 'CSV Import',
    description: 'Bring in bank statement exports and avoid duplicates.',
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Keep a simple set of editable spending categories.',
  },
]

const workflowSteps = [
  'Create a local project',
  'Import bank CSV exports',
  'Review and categorize transactions',
  'Understand spending history',
]

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')

  const currentSection = navigationItems.find(
    (item) => item.id === activeSection,
  )

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
              className={item.id === activeSection ? 'nav-item active' : 'nav-item'}
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
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
          <article className="empty-card primary-card">
            <p className="eyebrow">Current section</p>
            <h3>{currentSection?.label}</h3>
            <p>{currentSection?.description}</p>
            <div className="empty-state">
              <strong>No project is open yet.</strong>
              <span>
                Project creation, SQLite storage, CSV import, and transaction data
                will arrive in later phases.
              </span>
            </div>
          </article>

          <article className="empty-card">
            <p className="eyebrow">Primary workflow</p>
            <ol className="workflow-list">
              {workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </section>

        <section className="placeholder-grid" aria-label="Feature placeholders">
          {navigationItems.map((item) => (
            <article className="placeholder-card" key={item.id}>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <span>Placeholder</span>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export default App
