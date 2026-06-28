# Fintory MVP Architecture / Implementation Plan

Date: 2026-06-28

## Current state
- Vite + React + TypeScript starter.
- No Electron, SQLite, CSV import, project model, transactions, categories, or analytics yet.
- src/App.tsx still contains starter/demo UI.

## Constraints
- Local-first desktop app.
- No cloud, telemetry, bank APIs, sync, or hidden network behavior.
- Financial data stays on the user computer.
- MVP workflow: create/open project, import CSV, store transactions, avoid duplicates, explore history.

## Agents
- Use coder-react for implementation.
- Use committer after each completed phase.

## Target structure
- src/main: Electron lifecycle, filesystem, SQLite, CSV parsing, migrations, IPC handlers.
- src/preload: narrow typed contextBridge API.
- src/renderer: React UI only.
- src/shared: DTOs, validation, IPC contracts.

Proposed folders:
- src/main/app
- src/main/ipc
- src/main/db/repositories
- src/main/import/adapters
- src/main/project
- src/preload
- src/renderer/layout
- src/renderer/pages
- src/renderer/features
- src/shared/types
- src/shared/validation

## Electron boundary
- contextIsolation: true.
- nodeIntegration: false.
- Renderer must not access Node.js, filesystem, or SQLite directly.
- Main process validates all IPC inputs.
- File access must be explicit and user-initiated.
- Do not log raw transactions, account data, or CSV contents.

## Project model
- One Fintory project should be one local SQLite file.
- Example: Personal.fintory.sqlite.
- Benefits: simple backup, clear privacy boundary, simple create/open workflow.

## SQLite model
- project_meta: id, name, created_at, updated_at, schema_version.
- categories: id, name, color, created_at, updated_at.
- import_batches: id, source_file_name, source_file_hash, adapter_id, imported_at, row_count, inserted_count, duplicate_count, failed_count.
- transactions: id, transaction_date, description, merchant, amount_minor, currency, direction, category_id, source_hash, import_batch_id, raw_description, created_at, updated_at.
- Use integer amount_minor for money.
- Index transaction_date, category_id, direction, source_hash, import_batch_id, and import_batches.source_file_hash.

## IPC APIs
- project.create(input), project.open(), project.getCurrent(), project.close().
- import.selectCsvFiles(), import.importCsvFiles(input), import.listBatches().
- transactions.list(query), transactions.updateCategory(input), transactions.getFilters().
- categories.list(), categories.create(input), categories.update(input), categories.delete(input).
- analytics.getDashboard(query), analytics.getExpensesByMonth(query), analytics.getExpensesByCategory(query), analytics.getLargestExpenses(query).

## CSV import pipeline
1. Select files.
2. Read file.
3. Detect or select adapter.
4. Parse CSV rows.
5. Validate required columns.
6. Normalize to TransactionDraft.
7. Compute source_hash.
8. Detect duplicates.
9. Write import_batch and transactions in one SQLite transaction.
10. Return summary.

Rules: treat CSV as untrusted input, keep bank parsing in adapters, preserve import history, do not silently discard malformed rows, make re-import idempotent, do not log raw financial data.

## Milestones
1. Replace starter with Fintory app shell: layout, empty states, navigation placeholders. Checks: npm run lint, npm run build.
2. Add Electron foundation: main, preload, secure BrowserWindow, bridge, dev/build scripts. Checks: npm run lint, npm run build, npm run dev.
3. Add project creation/opening and SQLite connection: project service, DB connection, migrations, project IPC, project UI.
4. Add database schema and repositories: project_meta, categories, import_batches, transactions.
5. Add CSV parser and import service: parser, generic adapter, normalization, duplicate hash, import transaction, summary UI.
6. Add transactions page: table, search, date range, category filter, income/expense filter, sorting, pagination. Filtering in SQLite.
7. Add categories: list, create/edit, assign category to transaction. No automatic rules in MVP.
8. Add dashboard analytics: expenses by month/category, income by month, largest expenses, period summary.
9. Add polish: import errors, malformed CSV summary, no-data states, DB failure messages, loading states.
10. Add packaging: Electron packaging, Windows target, offline packaged-app verification.

## Risks
- SQLite native dependency can complicate Electron packaging.
- Bank CSV formats vary significantly.
- Duplicate detection may miss near-duplicates.
- Privacy can be compromised by accidental logs or network dependencies.
- Renderer security depends on strict preload boundary.
- Large CSV imports can slow UI if all data is loaded into React.

## Open questions
1. SQLite approach: better-sqlite3, sqlite3, Drizzle, Prisma, or plain SQL?
2. Project extension: .sqlite, .fintory.sqlite, or .fintory?
3. Which bank CSV format should be supported first?
4. Manual CSV column mapping or one known format first?
5. Add Mantine immediately?
6. Use React Router or simple local page state?
7. Preserve raw CSV rows or only normalized fields and metadata?
8. Seed default categories?

## Recommended next step
Start with Phase 1, then Phase 2. Keep each phase commit-worthy.
