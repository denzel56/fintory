---
name: domain-fintory
description: "Required for Fintory product decisions and feature work. Encodes README principles: local-first, privacy, simplicity, CSV import, SQLite, transactions, categories, and analytics."
---

# Fintory Domain

Fintory is a local desktop application for building and exploring personal financial history from bank CSV exports.

## Product Invariants

- Local first: all user data stays on the user's computer.
- No cloud synchronization.
- No telemetry.
- No bank API integrations.
- No subscription-oriented product assumptions.
- The MVP should stay simple and focused.

## Primary Workflow

1. Create a project.
2. Import one or more bank CSV files.
3. Store transactions locally.
4. Explore financial history.
5. Import newer CSV files later.
6. Preserve existing data and avoid duplicates.

## MVP Scope

- Projects.
- CSV import.
- SQLite local storage.
- Transactions with search, sorting, filtering, date range, and categories.
- Editable categories.
- Basic analytics: expenses by month, expenses by category, income, largest expenses.

Avoid features outside the MVP unless explicitly requested.
