# Fintory MVP Architecture / Implementation Plan

Date: 2026-06-28  
Updated: 2026-06-29

## Current state
- Vite + React + TypeScript starter.
- No Electron, SQLite, CSV import, project model, transactions, categories, or analytics yet.
- `src/App.tsx` still contains starter/demo UI.

## Product constraints
- Fintory is a local-first desktop app.
- No cloud, telemetry, bank APIs, sync, or hidden network behavior.
- Financial data stays on the user's computer.
- MVP workflow: create/open project, import CSV, store transactions, avoid duplicates, explore history.
- Every task below should preserve the Electron boundary: renderer UI only, main process for filesystem/SQLite/CSV, narrow typed preload bridge.

## Agents
- Use `coder-react` for implementation because the selected stack is React + TypeScript.
- Use `committer` after each completed phase/task group.
- For final branch review, use a React/Electron/privacy-aware reviewer.

## Target structure
- `src/main`: Electron lifecycle, filesystem, SQLite, CSV parsing, migrations, IPC handlers.
- `src/preload`: narrow typed contextBridge API.
- `src/renderer`: React UI only.
- `src/shared`: DTOs, validation, IPC contracts.

Proposed folders:
- `src/main/app`
- `src/main/ipc`
- `src/main/db/repositories`
- `src/main/import/adapters`
- `src/main/project`
- `src/preload`
- `src/renderer/layout`
- `src/renderer/pages`
- `src/renderer/features`
- `src/shared/types`
- `src/shared/validation`

## Electron boundary
- `contextIsolation: true`.
- `nodeIntegration: false`.
- Renderer must not access Node.js, filesystem, or SQLite directly.
- Main process validates all IPC inputs.
- File access must be explicit and user-initiated.
- Do not log raw transactions, account data, file paths that expose private data, or CSV contents.

## Project model
- One Fintory project should be one local SQLite file.
- Recommended extension: `.fintory.sqlite` unless a later packaging/storage decision changes this.
- Example: `Personal.fintory.sqlite`.
- Benefits: simple backup, clear privacy boundary, simple create/open workflow.

## SQLite model
- `project_meta`: `id`, `name`, `created_at`, `updated_at`, `schema_version`.
- `categories`: `id`, `name`, `color`, `created_at`, `updated_at`.
- `import_batches`: `id`, `source_file_name`, `source_file_hash`, `adapter_id`, `imported_at`, `row_count`, `inserted_count`, `duplicate_count`, `failed_count`.
- `transactions`: `id`, `transaction_date`, `description`, `merchant`, `amount_minor`, `currency`, `direction`, `category_id`, `source_hash`, `import_batch_id`, `raw_description`, `created_at`, `updated_at`.
- Use integer `amount_minor` for money.
- Add indexes for `transaction_date`, `category_id`, `direction`, `source_hash`, `import_batch_id`, and `import_batches.source_file_hash`.

## IPC APIs
- `app.getVersion()`
- `project.create(input)`, `project.open()`, `project.getCurrent()`, `project.close()`
- `import.selectCsvFiles()`, `import.importCsvFiles(input)`, `import.listBatches()`
- `transactions.list(query)`, `transactions.updateCategory(input)`, `transactions.getFilters()`
- `categories.list()`, `categories.create(input)`, `categories.update(input)`, `categories.delete(input)`
- `analytics.getDashboard(query)`, `analytics.getExpensesByMonth(query)`, `analytics.getExpensesByCategory(query)`, `analytics.getLargestExpenses(query)`

## CSV import pipeline
CSV import must be handled by Node.js code in the Electron main process. The React renderer shows import UI and calls typed preload/IPC methods, but it must not access raw Node.js APIs, filesystem paths, CSV contents, or SQLite directly.

Renderer responsibilities:
- show import UI, empty states, progress, errors, and summary;
- call typed preload methods such as `import.selectCsvFiles()` and `import.importCsvFiles(input)`;
- avoid storing raw CSV rows or private file paths in React state unless explicitly needed.

Main process responsibilities:
- open native file dialogs;
- read selected CSV files using Node.js filesystem APIs;
- parse and validate CSV rows;
- normalize transactions;
- detect duplicates;
- write import batches and transactions to SQLite.

Pipeline:
1. Select files.
2. Read file.
3. Detect or select adapter.
4. Parse CSV rows.
5. Validate required columns.
6. Normalize to `TransactionDraft`.
7. Compute `source_hash`.
8. Detect duplicates.
9. Write `import_batch` and transactions in one SQLite transaction.
10. Return summary.

Rules: treat CSV as untrusted input, keep bank parsing in adapters, preserve import history, do not silently discard malformed rows, make re-import idempotent, do not log raw financial data.

## Development task plan

Each task is intended to be small enough for one focused implementation step. Several very small adjacent tasks can be grouped into one commit only if they remain easy to review and revert. Run `committer` after each completed commit-worthy task or task group.

### 0. Planning and repository hygiene
- Confirm the feature branch is not `main`.
- Inspect existing scripts, dependencies, and current Vite structure.
- Confirm no unrelated local changes before implementation.
- Verification: `git status`, `npm run lint`/`npm run build` if scripts already exist.

### 1. Replace starter UI with a Fintory shell
- Remove Vite starter/demo content from `src/App.tsx` and related starter styling.
- Add minimal Fintory landing shell with app title, local-first positioning, and empty-state copy.
- Do not introduce Electron, routing, database, or import logic yet.
- Files likely changed: `src/App.tsx`, existing CSS files.
- Verification: `npm run lint`, `npm run build`.

### 2. Add renderer navigation placeholders
- Add simple page state or initial router decision for Dashboard, Import, Transactions, Categories, Settings/About if needed.
- Create placeholder page components with empty states only.
- Keep this renderer-only.
- Files likely changed: `src/renderer/layout/*`, `src/renderer/pages/*`, `src/App.tsx`.
- Verification: `npm run lint`, `npm run build`.

### 3. Introduce UI library intentionally
- Decide whether Mantine is added now or deferred.
- If added now, install/configure Mantine and convert the shell to `AppShell`/basic Mantine components.
- Avoid custom design systems.
- Files likely changed: `package.json`, `src/main.tsx`, renderer layout files.
- Verification: `npm install` if needed, `npm run lint`, `npm run build`.

### 4. Add Electron process skeleton
- Add Electron main entry.
- Create secure `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`.
- Wire dev/prod loading without exposing Node to renderer.
- Files likely changed: `src/main/*`, Electron config/scripts, `package.json`, `tsconfig` if needed.
- Verification: `npm run lint`, `npm run build`, Electron dev command.

### 5. Add preload skeleton and typed bridge
- Add preload entry with `contextBridge`.
- Expose only a small typed API object.
- Add shared type definitions for the bridge.
- Add `app.getVersion()` as the first harmless IPC method.
- Files likely changed: `src/preload/*`, `src/shared/*`, `src/main/ipc/*`, renderer bridge typing.
- Verification: renderer can call `app.getVersion()` through preload; no direct Node access in renderer.

### 6. Define project state and DTOs
- Define project DTOs: current project, create input, open result, close result.
- Decide visible UI fields: project name and safe display path/name if needed.
- Keep filesystem paths in main unless UI explicitly needs a safe display value.
- Files likely changed: `src/shared/types/project*`, `src/shared/validation/*`.
- Verification: typecheck/build.

### 7. Implement project IPC without SQLite writes
- Add native create/open dialogs in main process.
- Implement `project.getCurrent()`, `project.create()`, `project.open()`, `project.close()` with in-memory current project state first.
- Ensure renderer only calls preload methods.
- Files likely changed: `src/main/project/*`, `src/main/ipc/project*`, `src/preload/*`, project UI.
- Verification: create/open/close flow works in dev; invalid IPC inputs handled.

### 8. Choose and validate SQLite dependency
- Pick SQLite approach after a small compatibility check: likely `better-sqlite3`, `sqlite3`, Drizzle, Prisma, or plain SQL.
- Prefer the simplest reliable Electron-compatible option.
- Verify native dependency behavior before building more database code.
- Files likely changed: `package.json`, small DB smoke test/module.
- Verification: install/build/dev startup succeeds on Windows.

### 9. Add SQLite connection service
- Open a selected `.fintory.sqlite` file from main process.
- Keep one active project connection at a time.
- Close connection on project close/app shutdown.
- Files likely changed: `src/main/db/*`, `src/main/project/*`.
- Verification: create/open project opens a DB connection; close releases it.

### 10. Add migration foundation
- Add migration runner and schema version tracking.
- Initialize an empty project database deterministically.
- Make migrations idempotent and ordered.
- Files likely changed: `src/main/db/migrations/*`, `src/main/db/*`.
- Verification: create new project, reopen existing project, migration version remains stable.

### 11. Add core database schema
- Add tables: `project_meta`, `categories`, `import_batches`, `transactions`.
- Add indexes for import and transaction queries.
- Use integer `amount_minor`; avoid floating money storage.
- Files likely changed: migration files, schema constants if used.
- Verification: migration smoke test; inspect schema through app-level test/helper if available.

### 12. Add repository layer skeleton
- Add focused repositories for project meta, categories, import batches, and transactions.
- Keep SQL parameterized.
- Add a transaction helper for multi-step writes.
- Files likely changed: `src/main/db/repositories/*`.
- Verification: repository smoke tests or small main-process checks if test setup exists.

### 13. Seed/read default categories
- Decide default MVP categories.
- Insert default categories only for new projects, idempotently.
- Add `categories.list()` IPC and basic renderer display.
- Files likely changed: category repository, category IPC, categories page.
- Verification: new project shows default categories; reopened project does not duplicate them.

### 14. Add category management
- Implement `categories.create`, `categories.update`, `categories.delete` with validation.
- Prevent unsafe deletes if referenced transactions require a policy; simplest MVP can set category to null before delete or block delete.
- Add create/edit/delete UI.
- Files likely changed: category repository/IPC/UI.
- Verification: category CRUD works after app restart.

### 15. Add CSV file selection
- Implement `import.selectCsvFiles()` with native file dialog.
- Return selected file tokens/metadata needed by main process, not raw CSV contents.
- Avoid exposing full paths in renderer unless necessary for user confirmation.
- Files likely changed: import IPC, preload API, import page.
- Verification: selecting one or multiple CSV files returns safe metadata.

### 16. Add import batch listing
- Implement `import.listBatches()` from SQLite.
- Show import history placeholder/table in Import page.
- No parsing yet.
- Files likely changed: import batch repository, import IPC, import UI.
- Verification: empty state works; later batches can be displayed.

### 17. Add CSV parser foundation
- Add main-process CSV parsing utility.
- Handle encoding assumptions explicitly.
- Return structured parsed rows and structured malformed-row errors.
- Do not write to DB yet.
- Files likely changed: `src/main/import/*`.
- Verification: parser handles valid CSV and malformed CSV fixture/sample without logging sensitive raw data.

### 18. Add adapter interface and first adapter
- Define `CsvImportAdapter` interface.
- Implement the first generic/known-bank adapter.
- Validate required columns and normalize date, amount, currency, description, direction.
- Files likely changed: `src/main/import/adapters/*`, shared import types.
- Verification: sample rows normalize to `TransactionDraft`; malformed rows are reported.

### 19. Add duplicate hashing
- Define deterministic `source_hash` inputs.
- Include enough normalized fields to make re-import idempotent.
- Add uniqueness handling in repository/schema if appropriate.
- Files likely changed: import hashing helper, transaction repository, migration if needed.
- Verification: same transaction from same CSV format gets same hash across runs.

### 20. Implement DB-backed import transaction
- Implement `import.importCsvFiles(input)` end-to-end in main.
- Read selected files, parse, normalize, compute hashes, insert batch and transactions in one SQLite transaction.
- Count inserted, duplicate, and failed rows.
- Files likely changed: import service, repositories, import IPC.
- Verification: importing same file twice inserts once and reports duplicates on second import.

### 21. Build import UI flow
- Add file selection UI, selected-files summary, import action, progress/loading state, and result summary.
- Show malformed/failed counts without exposing raw financial data unnecessarily.
- Files likely changed: import page/components.
- Verification: create project -> select CSV -> import -> see summary.

### 22. Add transactions list backend
- Implement `transactions.list(query)`.
- Support pagination, sorting, search, date range, category filter, and direction filter in SQLite.
- Add `transactions.getFilters()` if needed for categories/date bounds.
- Files likely changed: transaction repository, transaction IPC, shared query types.
- Verification: query combinations return stable results and do not load all rows into renderer.

### 23. Build transactions table UI
- Add transactions page table with loading/error/empty states.
- Add search, sort, date range, category filter, direction filter, and pagination UI.
- Keep filtering backed by IPC/SQLite, not client-only over the full dataset.
- Files likely changed: transactions page/components.
- Verification: imported transactions can be explored with filters.

### 24. Add category assignment to transactions
- Implement `transactions.updateCategory(input)`.
- Add category selector in transactions UI.
- Ensure updates persist after app restart.
- Files likely changed: transaction repository/IPC/UI.
- Verification: assign category -> reload/reopen -> category remains.

### 25. Add analytics query backend
- Implement analytics queries for period summary, expenses by month, expenses by category, income by month, and largest expenses.
- Keep SQL aggregation in main/database layer.
- Files likely changed: analytics repository/service/IPC, shared analytics types.
- Verification: queries return expected aggregates on sample data.

### 26. Build dashboard MVP
- Add dashboard cards/tables/charts for basic analytics.
- Include no-data states and simple period filtering if it improves the primary workflow.
- Avoid advanced budgeting/accounting features.
- Files likely changed: dashboard page/components.
- Verification: after import, dashboard answers “where did my money go?” quickly.

### 27. Improve import and data error states
- Add user-friendly messages for unsupported format, malformed rows, DB write failures, duplicate-only imports, and empty files.
- Ensure errors do not reveal raw CSV contents in logs or UI unless intentionally summarized.
- Files likely changed: import service, shared error types, import UI.
- Verification: manually exercise invalid CSV and duplicate import scenarios.

### 28. Improve project/database failure states
- Add UI handling for missing project, open failure, migration failure, locked/corrupt DB, and project close.
- Keep recovery simple: close project, choose another project, or show actionable message.
- Files likely changed: project service/IPC, app shell, project UI.
- Verification: app remains usable after failed open/migration scenario.

### 29. Privacy and Electron security review
- Review IPC surface for raw Node exposure and missing validation.
- Review logs for financial data, paths, CSV rows, account-like values.
- Confirm no telemetry/network dependencies were added.
- Files likely changed: small fixes only.
- Verification: manual code review checklist plus lint/build.

### 30. Packaging spike
- Add Electron packaging setup for Windows.
- Verify SQLite native dependency works in packaged app.
- Verify app starts and performs create/open/import offline.
- Files likely changed: packaging config, scripts, docs if needed.
- Verification: packaged Windows build smoke test.

### 31. MVP workflow review
- Run the full user workflow:
  1. create project;
  2. import one or more CSV files;
  3. see transactions;
  4. assign categories;
  5. view dashboard;
  6. close/reopen project;
  7. re-import the same CSV and confirm duplicates are skipped.
- Record known limitations and next issues.
- Verification: manual MVP checklist documented in issue/PR notes.

## Recommended commit grouping

Prefer one commit per task. If development overhead is high, these groups are acceptable as long as each group stays reviewable:

1. Renderer shell: tasks 1-3.
2. Electron/IPC foundation: tasks 4-5.
3. Project lifecycle: tasks 6-7.
4. SQLite foundation: tasks 8-12.
5. Categories: tasks 13-14.
6. CSV import foundation: tasks 15-19.
7. DB-backed import UI: tasks 20-21.
8. Transactions: tasks 22-24.
9. Analytics/dashboard: tasks 25-26.
10. Reliability/security/packaging: tasks 27-31.

Run `committer` after each completed group or after any standalone task that creates a meaningful review boundary.

## Risks
- SQLite native dependency can complicate Electron packaging; validate this before building too much DB code.
- Bank CSV formats vary significantly; start with one concrete format and keep adapter boundaries simple.
- Duplicate detection may miss near-duplicates; MVP should guarantee exact/idempotent re-import for supported formats first.
- Privacy can be compromised by accidental logs, raw file paths, raw CSV rows, or network dependencies.
- Renderer security depends on a strict preload boundary.
- Large CSV imports can slow UI if all data is loaded into React; keep filtering/pagination in SQLite.

## Open questions
1. SQLite approach: `better-sqlite3`, `sqlite3`, Drizzle, Prisma, or plain SQL?
2. Confirm project extension: `.fintory.sqlite` or `.fintory`?
3. Which bank CSV format should be supported first?
4. Manual CSV column mapping now, or one known format first?
5. Add Mantine immediately, or keep plain React for the first shell?
6. Use React Router or simple local page state for MVP navigation?
7. Preserve raw CSV rows, or only normalized fields and import metadata?
8. Seed default categories? If yes, which list?

## Recommended next step
Start with tasks 0-1, then task 2. Keep each completed task or small task group commit-worthy, and run `committer` after each completed phase.
