type PlaceholderPageProps = {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
}

export function PlaceholderPage({
  description,
  emptyDescription,
  emptyTitle,
  eyebrow,
  title,
}: PlaceholderPageProps) {
  return (
    <article className="empty-card primary-card">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="empty-state">
        <strong>{emptyTitle}</strong>
        <span>{emptyDescription}</span>
      </div>
    </article>
  )
}
