import { PlaceholderPage } from './PlaceholderPage'

export function AboutPage() {
  return (
    <PlaceholderPage
      description="A future place for project settings, app version details, and local-first privacy notes."
      emptyDescription="Settings and app metadata will be added only when Electron and the typed preload bridge exist."
      emptyTitle="Settings are not available yet."
      eyebrow="Settings / About"
      title="Settings and about placeholder"
    />
  )
}
