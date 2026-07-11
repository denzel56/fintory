# Backlog

Use this file for follow-up tasks, technical debt, and known issues that should be fixed in future phases but are not part of the current focused task.

When a new non-urgent problem is discovered during implementation or review, add it here with enough context to make it actionable later.

## Open items

### Refactor shared IPC channel constants for preload compatibility

- **Status:** open
- **Priority:** low
- **Area:** Electron preload / IPC architecture
- **Context:** `src/preload/index.cts` duplicates IPC channel strings because Electron sandbox preload must load as CommonJS, while the existing shared IPC modules are emitted as ESM.
- **Risk:** if a channel string changes in `src/shared/ipc/*` but the duplicate preload string is not updated, renderer-to-main IPC calls can break.
- **Future direction:** create one CJS-safe source of truth for IPC channel constants, such as JSON constants, a dedicated CommonJS-compatible constants module, or a bundled preload build. Keep the typed API surface unchanged for renderer code.
- **Verification:** `npm run lint`, `npm run build`, and manual Electron startup confirming `window.fintory` is available.


### Add clear import history action

- **Status:** open
- **Priority:** medium
- **Area:** CSV import / import history UI / SQLite
- **Context:** The Import page shows stored import batches but does not provide a way to clear the history after manual testing or after a user no longer needs batch records.
- **Scope:** add a user-confirmed `Clear history` action that deletes import batch records for the active project while preserving imported transactions.
- **Data policy:** clearing import history must not delete transactions; existing `transactions.import_batch_id` should become `NULL` through the schema's `ON DELETE SET NULL` behavior or an explicit safe update/delete transaction.
- **Privacy:** do not log file names, transaction data, CSV contents, or local paths during the clear action.
- **Verification:** import CSV -> confirm history row appears -> clear history -> confirm history is empty -> confirm Transactions page still shows imported transactions.

### Improve manual CSV import direction and category handling

- **Status:** open
- **Priority:** high
- **Area:** CSV import / transactions / categories
- **Context:** Manual CSV import currently derives transaction direction only from the signed amount: negative values become `expense`, positive values become `income`. Bank exports that store expenses as positive values, or use a separate debit/credit/direction column, can import every transaction as `income`. Imported transactions are also written with `category_id = NULL`, so categories are not determined during import.
- **Scope:** add manual import options for direction mapping, such as signed amount, positive-is-expense, or a direction/debit-credit column. Add tests/smoke coverage for positive expense formats. Separately add category assignment support and consider minimal safe defaults (`income` -> Income, `expense` -> Other) before adding keyword-based auto-categorization.
- **Privacy:** do not expose raw CSV rows, local file paths, account numbers, or transaction contents in logs or renderer diagnostics.
- **Verification:** import a CSV with positive expense amounts and confirm directions are correct; confirm imported transactions can be assigned categories and persist after reload/reopen; run `npm run smoke:csv-import`, `npm run build`, and `npm run lint`.
