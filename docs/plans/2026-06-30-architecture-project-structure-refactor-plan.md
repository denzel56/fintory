# Renderer And Electron Project Structure Plan

Date: 2026-06-30
Status: Proposed
Scope: Architecture refactor only; no new product behavior.

## Context

Fintory is a local-first Electron + React desktop finance application. The codebase is still small, but renderer components and process-specific code are starting to accumulate in broad folders. To prevent files from being placed arbitrarily, use a lightweight feature-oriented structure.

This plan should guide future agents when adding pages, components, IPC, project lifecycle UI, CSV import UI, transaction views, categories, and analytics.

## Chosen Architecture

Use a lightweight feature-oriented / vertical-slice structure while keeping Electron process boundaries explicit.

Target structure:

~~~txt
src/
  main/          Electron main process: windows, dialogs, IPC handlers, SQLite later
  preload/       narrow typed bridge only
  shared/        process-safe contracts, DTOs, validation, IPC channel definitions
  renderer/
    app/         App root, app shell, navigation config, provider wiring
    pages/       route/page-level screens only
    features/    user workflows and domain UI slices
    shared/      renderer-only reusable UI, hooks, formatting helpers
~~~

## Core Rules

1. main, preload, renderer, and root shared are process boundaries.
2. Renderer must not import Node.js, filesystem, SQLite, Electron main APIs, or raw ipcRenderer.
3. Renderer talks to system behavior only through window.fintory typed preload capabilities.
4. Root shared is for cross-process-safe contracts: DTOs, validation helpers, IPC channel names, and result types.
5. renderer/pages contains page-level composition only.
6. renderer/features contains user workflows such as project-lifecycle, csv-import, transactions, categories, and analytics.
7. renderer/shared contains renderer-only reusable building blocks with no feature ownership.
8. Avoid barrel exports and path aliases until they clearly reduce friction.
9. Avoid global state libraries until state is genuinely shared and complex.
10. Architecture refactors must not add product behavior.

## Recommended Phases

Each phase should be small enough for one focused commit. Run committer after each completed phase.

### Phase 1 - Organize Renderer App Structure

Recommended commit: refactor: organize renderer app structure

Move app-level files:

~~~txt
src/App.tsx -> src/renderer/app/App.tsx
src/renderer/layout/AppLayout.tsx -> src/renderer/app/AppLayout.tsx
src/renderer/pages/types.ts -> src/renderer/app/navigation.ts
src/renderer/pages/PlaceholderPage.tsx -> src/renderer/shared/ui/PlaceholderPage.tsx
~~~

Keep src/main.tsx as the Vite renderer entry and update it to import renderer/app/App.

Verification:

~~~bash
npm run lint
npm run build
~~~

### Phase 2 - Group Pages By Route

Recommended commit: refactor: group renderer pages by route

Target structure:

~~~txt
src/renderer/pages/
  dashboard/DashboardPage.tsx
  import/ImportPage.tsx
  transactions/TransactionsPage.tsx
  categories/CategoriesPage.tsx
  about/AboutPage.tsx
~~~

Rules:

- A page composes layout and feature components.
- A page should not own large workflow logic.
- Page-specific tiny helpers can stay beside the page.

Verification:

~~~bash
npm run lint
npm run build
~~~

### Phase 3 - Move Project Lifecycle To Feature Slice

Recommended commit: refactor: move project lifecycle to feature slice

Move:

~~~txt
src/renderer/pages/about/ProjectLifecycleCard.tsx
  -> src/renderer/features/project-lifecycle/ProjectLifecycleCard.tsx
~~~

If this workflow grows later, split inside the same feature folder:

~~~txt
src/renderer/features/project-lifecycle/
  ProjectLifecycleCard.tsx
  useProjectLifecycle.ts
  projectLifecycleView.ts
~~~

Do not introduce this split unless the component becomes harder to read.

Verification:

~~~bash
npm run lint
npm run build
~~~

### Phase 4 - Split Electron Main Bootstrap

Recommended commit: refactor: split electron main app setup

Target structure:

~~~txt
src/main/index.ts
src/main/app/create-main-window.ts
src/main/app/navigation-security.ts
src/main/ipc/register-ipc-handlers.ts
~~~

Rules:

- index.ts should be a thin bootstrap.
- create-main-window.ts owns BrowserWindow creation and renderer loading.
- navigation-security.ts owns URL allowlist/navigation checks.
- register-ipc-handlers.ts composes app/project handlers.

Verification:

~~~bash
npm run lint
npm run build
timeout 20s npm run dev:electron
~~~

### Phase 5 - Document Architecture Rules Permanently

Recommended commit: docs: document project structure rules

Create docs/architecture/project-structure.md with the chosen folder structure, dependency rules, how to add pages/features/IPC, privacy constraints, and placement examples.

Verification:

~~~bash
npm run lint
npm run build
~~~

## Future Placement Examples

Project lifecycle:

~~~txt
src/shared/types/project.ts
src/shared/validation/project.ts
src/shared/ipc/project.ts
src/main/ipc/project.ts
src/main/project/project-state.ts
src/renderer/features/project-lifecycle/ProjectLifecycleCard.tsx
~~~

CSV import:

~~~txt
src/shared/types/import.ts
src/shared/ipc/import.ts
src/main/ipc/import.ts
src/main/import/...
src/renderer/features/csv-import/...
src/renderer/pages/import/ImportPage.tsx
~~~

Transactions:

~~~txt
src/shared/types/transaction.ts
src/shared/ipc/transaction.ts
src/main/transactions/...
src/renderer/features/transactions/...
src/renderer/pages/transactions/TransactionsPage.tsx
~~~

Categories:

~~~txt
src/shared/types/category.ts
src/shared/ipc/category.ts
src/main/categories/...
src/renderer/features/categories/...
src/renderer/pages/categories/CategoriesPage.tsx
~~~

## Risks And Mitigations

- Risk: overengineering too early. Mitigation: no aliases, barrels, DI, global stores, or routing libraries unless needed.
- Risk: large import-only diff. Mitigation: split into small commits by phase.
- Risk: mixing refactor with behavior changes. Mitigation: architecture phases must preserve behavior.
- Risk: weakening Electron security boundaries. Mitigation: keep process boundary rules explicit.

## Agent Guidance

Recommended implementer: coder-react for renderer phases and coder-react or Electron-aware coder for main bootstrap phase.

After each phase:

1. Run checks.
2. Inspect diff.
3. Run committer for a focused commit.
4. Do not proceed to the next phase with a dirty working tree.
