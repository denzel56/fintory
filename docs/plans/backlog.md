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

### Add lightweight dashboard charts

- **Status:** open
- **Priority:** high
- **Area:** Dashboard / analytics UI
- **Context:** The Dashboard MVP currently shows analytics as summary cards and tables only. During manual review, the page looked more like a report than a dashboard; monthly income/expense and category breakdowns should be visually scannable.
- **Scope:** add lightweight charts for expenses/income by month and expenses by category, preferably using Mantine primitives, CSS, or small local SVG components before adding a chart dependency. Keep the existing tables as detail views below the charts.
- **MVP note:** useful polish for Task 26 because basic analytics are easier to understand visually, but avoid broad chart customization or a heavy dependency unless necessary.
- **Privacy:** render only local analytics data already returned by `window.fintory.analytics`; do not add network calls, telemetry, screenshots, or logging of financial values.
- **Verification:** import sanitized transactions, confirm charts match table totals/counts for all-time and filtered periods, then run `npm run lint` and `npm run build`.

### Apply categories to similar transactions with confirmation

- **Status:** open
- **Priority:** high
- **Area:** Transactions / categories / SQLite
- **Context:** Selecting a category in the Transactions table updates only that single transaction. Users expect an option to apply the same category to repeated similar transactions, such as the same merchant/description and direction.
- **Scope:** after a transaction category change, offer a confirmation action such as “Apply to similar uncategorized transactions?” Show the affected count before applying. Match conservatively by normalized merchant or description plus direction, and default to updating only currently uncategorized transactions. Do not silently overwrite user-assigned categories.
- **Future direction:** user-confirmed merchant/category rules can later apply to future imports, but the first version should focus on a safe local bulk update for existing similar transactions.
- **Privacy:** all matching must stay local; do not log merchant names, descriptions, transaction amounts, account/card values, or local paths.
- **Verification:** assign a category to one repeated merchant, confirm the prompt/count, apply to similar uncategorized transactions, verify already categorized transactions are preserved unless explicitly requested, reload the project, and run `npm run lint`, `npm run build`, and `npm run smoke:sqlite`.

### Improve startup project selection flow

- **Status:** open
- **Priority:** high
- **Area:** Project lifecycle / Electron startup / UX
- **Context:** On app startup, the user should not have to manually reopen the same project every time. The app should either open the last used project automatically or show a clear project picker/start screen when no recent project can be opened.
- **Scope:** persist a safe recent-project reference locally, try to reopen the last project on startup, and fall back to a project selection screen if the file is missing, inaccessible, or invalid. The fallback should offer create/open project actions and show safe, non-sensitive project labels.
- **Privacy:** do not log full local paths or project financial contents. If recent-project metadata is stored, keep it local and minimal.
- **Verification:** start app after opening a project and confirm it reopens; move/delete the project file and confirm the app falls back gracefully to project selection; run `npm run lint` and `npm run build`.

### Add sorting options for largest expenses

- **Status:** open
- **Priority:** medium
- **Area:** Dashboard / analytics UI
- **Context:** Largest expenses are currently shown by amount only. Users need to inspect the list either by amount or by date, especially when reviewing recent large spending.
- **Scope:** add a UI control to sort the largest expenses table by amount or transaction date, with ascending/descending direction where useful. Keep the default amount-descending behavior for the “largest” view, but make date sorting easy to choose.
- **Future direction:** if sorting should happen at the database layer later, extend analytics query validation and repository ordering explicitly instead of sorting raw data in ad hoc UI code.
- **Privacy:** sort only the local analytics data already returned to the renderer; do not log transaction descriptions, merchants, amounts, or dates.
- **Verification:** import sanitized transactions with mixed dates/amounts, confirm amount and date sorting behave correctly, then run `npm run lint` and `npm run build`.

### Make non-blocking alerts dismissible or temporary

- **Status:** open
- **Priority:** medium
- **Area:** Renderer UX / notifications / error states
- **Context:** Some errors, warnings, or informational alerts remain visible indefinitely after they appear. This makes the UI feel stale and can obscure whether the problem is still active.
- **Scope:** introduce a consistent pattern for non-blocking feedback: transient notifications should auto-dismiss after a short duration, and inline alerts should be dismissible or clear automatically after the triggering state changes. Keep truly blocking states persistent until the user fixes the underlying problem.
- **MVP note:** improves trust and usability without changing core data behavior; apply first to common project, import, transactions, and dashboard feedback.
- **Privacy:** notification text must stay generic and must not include raw transaction data, CSV contents, account/card values, or full local file paths.
- **Verification:** trigger representative success, warning, and error messages; confirm non-blocking messages disappear or can be dismissed, blocking project/import failures remain visible while relevant, and run `npm run lint` and `npm run build`.

### Define application versioning and release policy

- **Status:** open
- **Priority:** medium
- **Area:** Release workflow / packaging / documentation
- **Context:** The app currently uses `0.0.0` in `package.json`. Before distributing MVP builds, Fintory needs a simple versioning policy so releases, installer builds, and schema-impacting changes are traceable.
- **Scope:** document and apply SemVer-style versioning: keep `0.0.0` during early development, use `0.1.0` for the first MVP build, bump `patch` for bug fixes, bump `minor` for user-visible features or SQLite migrations while still pre-1.0, and reserve `1.0.0` for a stable local-first release. Add release notes expectations for migration/schema changes.
- **Release workflow:** update `package.json` only as part of an explicit release/build task, not every feature PR. Prefer focused release commits/tags when packaging starts.
- **Privacy:** do not add auto-update, telemetry, or network-based update checks as part of versioning without an explicit future product decision.
- **Verification:** confirm the packaged app displays or embeds the intended version, release notes mention database migrations when relevant, and run `npm run lint` and `npm run build`.

### Explore local AI hints for spending insights

- **Status:** open
- **Priority:** low
- **Area:** Local AI / analytics / privacy / product strategy
- **Context:** Local AI could be useful in future Fintory versions, but it should support focused hints rather than a full chat experience. The desired direction is to help users notice spending patterns, repeated merchants, category suggestions, and possible areas to review or reduce expenses. The feature must avoid investment, credit, tax, or professional financial advice.
- **Preferred direction:** start with local embeddings or lightweight local models for similarity and suggestion ranking, such as merchant/category suggestions, repeated transaction grouping, and anomaly candidates. Consider WebLLM/WebGPU later as an optional advanced capability, potentially reserved for a Pro/AI edition, once packaging, performance, and privacy implications are understood.
- **Scope:** provide explainable, user-confirmed suggestions like “subscriptions increased”, “this merchant appears often”, “shopping is above your usual monthly range”, or “these uncategorized transactions look similar”. Do not implement an open-ended finance chatbot. Deterministic SQL/statistics should compute facts; AI may rank, cluster, or phrase local hints.
- **Product boundaries:** no investment recommendations, no lending/credit advice, no tax/legal advice, no automatic financial decisions, and no hidden actions. Suggestions should be review prompts, not authoritative advice.
- **Privacy:** all AI processing must be local and opt-in. Do not send financial data to cloud APIs, telemetry, or external model services. Prompts/context should be minimal and avoid raw account/card values, full local paths, or unnecessary transaction history.
- **Future architecture notes:** evaluate a staged approach: deterministic rules first, local embeddings second, optional WebLLM/WebGPU or local LLM provider later. Keep AI modules isolated behind a narrow typed boundary so the core local-first app works without AI installed or enabled.
- **Verification:** test with sanitized datasets, confirm suggestions are explainable and user-confirmed, confirm the app works when AI is disabled or unavailable, measure local performance on modest hardware, and run `npm run lint` and `npm run build`.

### Add transaction tags for cross-cutting analysis

- **Status:** open
- **Priority:** medium
- **Area:** Transactions / categories / analytics / SQLite
- **Context:** A single category such as Shopping is often too broad. Categories should represent the main budget bucket, while tags should capture cross-cutting context such as merchant, marketplace, subscription, vacation, shared expense, reimbursable, or one-time purchase.
- **Scope:** add local transaction tags with many-to-many assignment, tag management UI, transaction filtering by tag, and analytics breakdowns by tag. Keep one primary category per transaction for budget reporting, but allow multiple tags for flexible analysis.
- **Rule direction:** future merchant/category rules can assign tags separately from categories, such as merchant alias Wildberries -> tag `wildberries` and tag `marketplace`, while the category remains Clothes, Home, Gifts, or another budget bucket chosen by the user.
- **Privacy:** tags are user financial metadata and must stay local; do not log tag names together with raw transaction data, account/card values, CSV contents, or local paths.
- **Verification:** create/edit/delete tags, assign multiple tags to transactions, filter by tag, confirm tags persist after reload/reopen, confirm analytics totals remain correct, and run `npm run lint`, `npm run build`, and `npm run smoke:sqlite`.

### Refactor analytics IPC handler repetition

- **Status:** open
- **Priority:** low
- **Area:** Electron main IPC / analytics backend maintainability
- **Context:** `src/main/ipc/analytics.ts` registers several analytics handlers that repeat the same flow: validate query, check active project database, create analytics repository, call one repository method, and return a safe error on failure.
- **Scope:** extract a small typed helper for analytics IPC handlers while keeping every channel explicit, preserving main-process validation, and keeping renderer-facing result types unchanged.
- **MVP note:** not required before merging the analytics backend; current explicit code is working and easier to review, but refactoring can reduce future maintenance cost before adding more analytics endpoints.
- **Privacy:** helper must not add logging of raw transactions, CSV rows, account/card values, source hashes, or local paths.
- **Verification:** `npm run lint`, `npm run build`, and `npm run smoke:sqlite`.
