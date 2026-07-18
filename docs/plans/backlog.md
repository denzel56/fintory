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

### Make transaction ordering stable within the same date

- **Status:** open
- **Priority:** low
- **Area:** Transactions list / CSV import ordering
- **Context:** Statement CSV import works, duplicates are detected, and income/expense directions look correct, but transactions with the same `transactionDate` may not appear in the expected statement order.
- **Scope:** preserve a stable import/source row ordering signal, or add a deterministic secondary sort that matches user expectations for same-day operations. Keep the default Transactions view predictable after reload/reopen.
- **MVP note:** not critical for MVP as long as transactions are imported correctly and can be searched/filtered.
- **Privacy:** do not store or display raw CSV rows, account numbers, card numbers, or local file paths for ordering.
- **Verification:** import a sanitized multi-row same-day sample and confirm the displayed order is stable and documented.

### Add MCC-based automatic category assignment

- **Status:** open
- **Priority:** medium
- **Area:** CSV import / category mapping / MCC rules
- **Context:** Imported transactions currently use `category_id = NULL`. The user statement CSV includes `mcc` and bank `category` fields. MCC is a better base signal than merchant text for automatic categorization because it represents an international merchant category code.
- **Scope:** add built-in default MCC -> Fintory category rules for common categories, then allow the user to review/change mappings. If a target category already exists, assign it automatically; otherwise suggest creating or mapping it. Bank category text can be used as a secondary hint.
- **Rule priority:** user merchant/category rules should override bank category mapping; bank category mapping can override default MCC mapping; default MCC mapping should override Uncategorized.
- **MVP note:** useful but not required for the current MVP import path because transactions already import correctly.
- **Privacy:** never log raw category rows, transaction contents, account/card values, or local file paths; diagnostics should use counts and safe field names only.
- **Verification:** import a sanitized CSV with known MCC values and confirm matching transactions receive expected categories, while unknown MCC values remain Uncategorized or produce safe suggestions.

### Improve merchant display names with aliases and safe suggestions

- **Status:** open
- **Priority:** low
- **Area:** Transactions UX / merchant normalization
- **Context:** Some statement rows display legal entity names in `merchant`/`description` instead of the user-recognizable shop or recipient name. Manual aliases like `ООО РОМАШКА` -> `Кафе Ромашка` would be useful, but creating all aliases manually can be too much work.
- **Scope:** detect repeated or unclear merchant/description strings after import and offer an inline prompt to enter a user-friendly display name. Apply accepted aliases automatically to matching future imports. Do not try to guess specific brands from ambiguous strings without user confirmation.
- **MVP note:** not critical for MVP; raw imported merchant values are acceptable until transaction browsing needs more polish.
- **Privacy:** all matching/suggestion logic must stay local; no network lookup, telemetry, external merchant enrichment, or cloud model calls.
- **Verification:** import sanitized transactions with repeated legal names, confirm suggested aliases can be accepted/edited/ignored, and confirm search still finds both original and alias text where appropriate.
